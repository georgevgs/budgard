-- Every finance policy asked private.can_access_financial_space(user_id) once
-- per candidate row. The argument is the row's own column, so Postgres cannot
-- hoist the call, and a SECURITY DEFINER function is never inlined: a
-- 1,000-row page paid 1,000 calls, each parsing the JWT again.
--
-- The answer does not depend on the row. A session can reach its own space
-- and, as an accepted partner of a Pro owner, at most one other. Returning
-- that small set once per statement lets the planner evaluate it a single
-- time and match rows against it through the user_id indexes.
--
-- Only the USING clauses change. WITH CHECK runs per written row, where the
-- per-row call costs nothing worth trading for a longer migration, and each
-- one keeps its cross-reference checks exactly as written.
--
-- Measure before and after with EXPLAIN (ANALYZE) on the boot expenses query,
-- as an authenticated role with request.jwt.claims set. If the plan does not
-- improve, the rollback below restores the old shape.

CREATE FUNCTION private.accessible_financial_space_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid())
  WHERE (SELECT auth.uid()) IS NOT NULL
    AND (SELECT private.is_passwordless_session())
  UNION ALL
  SELECT share.owner_id
  FROM public.household_shares AS share
  JOIN public.subscriptions AS subscription
    ON subscription.user_id = share.owner_id
  WHERE share.member_id = (SELECT auth.uid())
    AND share.status = 'accepted'
    AND subscription.status IN ('trialing', 'active', 'past_due')
    AND (SELECT private.is_passwordless_session());
$$;

REVOKE ALL ON FUNCTION private.accessible_financial_space_ids()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.accessible_financial_space_ids()
  TO authenticated, service_role;

-- One rule, one place: the per-row predicate now asks the set, so the write
-- checks, the receipts bucket and the household-aware RPCs cannot drift from
-- what the read policies allow.
CREATE OR REPLACE FUNCTION private.can_access_financial_space(p_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    p_owner_id IN (SELECT private.accessible_financial_space_ids()),
    false
  );
$$;

REVOKE ALL ON FUNCTION private.can_access_financial_space(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_access_financial_space(UUID)
  TO authenticated, service_role;

DO $$
DECLARE
  target RECORD;
BEGIN
  FOR target IN
    SELECT *
    FROM (
      VALUES
        ('categories', 'Household can manage categories'),
        ('tags', 'Household can manage tags'),
        ('expenses', 'Household can view expenses'),
        ('expenses', 'Household can update expenses'),
        ('expenses', 'Household can delete expenses'),
        ('recurring_expenses', 'Household can manage recurring expenses'),
        ('expense_templates', 'Household can manage templates'),
        ('user_budgets', 'Household can manage budget settings'),
        ('category_budgets', 'Household can manage category budgets'),
        ('accounts', 'Household can manage accounts'),
        ('account_balances', 'Household can manage account balances'),
        ('debts', 'Household can manage debts'),
        ('goals', 'Household can manage goals'),
        ('no_spend_days', 'Household can manage no-spend days'),
        ('expense_tags', 'Household can manage expense tags'),
        ('transaction_rules', 'Household can manage transaction rules'),
        (
          'recurring_suggestion_dismissals',
          'Household can manage recurring suggestion dismissals'
        ),
        ('financial_connections', 'financial_connections_household_select'),
        (
          'financial_connection_accounts',
          'financial_connection_accounts_household_select'
        )
    ) AS policy(table_name, policy_name)
  LOOP
    EXECUTE format(
      'ALTER POLICY %I ON public.%I USING ('
        || 'user_id IN (SELECT private.accessible_financial_space_ids())'
        || ')',
      target.policy_name,
      target.table_name
    );
  END LOOP;
END;
$$;

-- A read policy this migration did not know about keeps working, it only
-- keeps the per-row cost. Name it so it is not left behind unnoticed.
DO $$
DECLARE
  remaining TEXT;
BEGIN
  SELECT string_agg(
    policy.tablename || ': ' || policy.policyname,
    ', '
    ORDER BY policy.tablename, policy.policyname
  )
  INTO remaining
  FROM pg_catalog.pg_policies AS policy
  WHERE policy.schemaname = 'public'
    AND policy.qual LIKE '%can_access_financial_space%';

  IF remaining IS NOT NULL THEN
    RAISE WARNING 'Policies still calling the per-row predicate: %', remaining;
  END IF;
END;
$$;

COMMENT ON FUNCTION private.accessible_financial_space_ids() IS
  'The spaces this session may reach: its own and an accepted Pro household. Empty for password or anonymous sessions.';

-- Rollback:
-- Re-run private.can_access_financial_space from
-- 20260925100000_reject_password_sessions.sql, set every policy above back to
-- USING ((SELECT private.can_access_financial_space(user_id))), then
-- DROP FUNCTION private.accessible_financial_space_ids();
