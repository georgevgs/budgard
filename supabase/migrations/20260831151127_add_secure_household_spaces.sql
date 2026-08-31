-- Household spaces let one Pro owner share their financial data with one
-- partner. The authenticated person and the owner of the active financial
-- space are deliberately separate concepts: shared rows keep the Pro owner's
-- user_id, while auth.uid() remains the actor performing the operation.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE TABLE public.household_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_email TEXT NOT NULL CHECK (
    char_length(owner_email) BETWEEN 3 AND 320
    AND position('@' IN owner_email) > 1
  ),
  invite_email TEXT NOT NULL CHECK (
    char_length(invite_email) BETWEEN 3 AND 320
    AND position('@' IN invite_email) > 1
  ),
  invite_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked')),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT household_shares_distinct_people CHECK (
    member_id IS NULL OR member_id <> owner_id
  ),
  CONSTRAINT household_shares_status_shape CHECK (
    (status = 'accepted' AND member_id IS NOT NULL AND accepted_at IS NOT NULL)
    OR (status IN ('pending', 'revoked') AND member_id IS NULL AND accepted_at IS NULL)
  )
);

CREATE INDEX household_shares_member_status_idx
  ON public.household_shares (member_id, status)
  WHERE member_id IS NOT NULL;
CREATE INDEX household_shares_invite_email_status_idx
  ON public.household_shares (lower(invite_email), status);

ALTER TABLE public.household_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view household shares"
  ON public.household_shares
  FOR SELECT
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR member_id = (SELECT auth.uid())
    OR (
      status = 'pending'
      AND lower(invite_email) = lower(COALESCE((SELECT auth.jwt() ->> 'email'), ''))
    )
  );

-- Keep the table read-only through PostgREST. All state transitions use the
-- guarded functions below, which prevents a client from assigning arbitrary
-- members or keeping access after an owner loses Pro.
REVOKE ALL ON TABLE public.household_shares FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public.household_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.household_shares TO service_role;

CREATE OR REPLACE FUNCTION private.can_access_financial_space(p_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p_owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.household_shares AS share
      JOIN public.subscriptions AS subscription
        ON subscription.user_id = share.owner_id
      WHERE share.owner_id = p_owner_id
        AND share.member_id = (SELECT auth.uid())
        AND share.status = 'accepted'
        AND subscription.status IN ('trialing', 'active', 'past_due')
    );
$$;

REVOKE ALL ON FUNCTION private.can_access_financial_space(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_access_financial_space(UUID)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_household_invite(p_invite_email TEXT)
RETURNS SETOF public.household_shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id UUID := auth.uid();
  caller_email TEXT := lower(COALESCE(auth.jwt() ->> 'email', ''));
  normalized_email TEXT := lower(trim(p_invite_email));
  existing_status TEXT;
BEGIN
  IF caller_id IS NULL OR caller_email = '' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF char_length(normalized_email) NOT BETWEEN 3 AND 320
     OR position('@' IN normalized_email) <= 1 THEN
    RAISE EXCEPTION 'Enter a valid email address' USING ERRCODE = '22023';
  END IF;

  IF normalized_email = caller_email THEN
    RAISE EXCEPTION 'Invite another person' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = caller_id
      AND status IN ('trialing', 'active', 'past_due')
  ) THEN
    RAISE EXCEPTION 'Household sharing requires Pro'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT status
  INTO existing_status
  FROM public.household_shares
  WHERE owner_id = caller_id
  FOR UPDATE;

  IF existing_status = 'accepted' THEN
    RAISE EXCEPTION 'This household already has a member'
      USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO public.household_shares (
    owner_id,
    owner_email,
    invite_email,
    invite_token,
    status,
    member_id,
    accepted_at,
    updated_at
  )
  VALUES (
    caller_id,
    caller_email,
    normalized_email,
    gen_random_uuid(),
    'pending',
    NULL,
    NULL,
    now()
  )
  ON CONFLICT (owner_id) DO UPDATE
  SET owner_email = EXCLUDED.owner_email,
      invite_email = EXCLUDED.invite_email,
      invite_token = EXCLUDED.invite_token,
      status = 'pending',
      member_id = NULL,
      accepted_at = NULL,
      updated_at = now();

  RETURN QUERY
  SELECT share.*
  FROM public.household_shares AS share
  WHERE share.owner_id = caller_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_household_invite(p_invite_token UUID)
RETURNS SETOF public.household_shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id UUID := auth.uid();
  caller_email TEXT := lower(COALESCE(auth.jwt() ->> 'email', ''));
  invited_owner_id UUID;
BEGIN
  IF caller_id IS NULL OR caller_email = '' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT owner_id
  INTO invited_owner_id
  FROM public.household_shares
  WHERE invite_token = p_invite_token
    AND status = 'pending'
    AND lower(invite_email) = caller_email
  FOR UPDATE;

  IF invited_owner_id IS NULL OR invited_owner_id = caller_id THEN
    RAISE EXCEPTION 'This household invitation is unavailable'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = invited_owner_id
      AND status IN ('trialing', 'active', 'past_due')
  ) THEN
    RAISE EXCEPTION 'This household invitation is unavailable'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.household_shares
    WHERE member_id = caller_id
      AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'You already belong to a household'
      USING ERRCODE = 'unique_violation';
  END IF;

  UPDATE public.household_shares
  SET member_id = caller_id,
      status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  WHERE owner_id = invited_owner_id;

  RETURN QUERY
  SELECT share.*
  FROM public.household_shares AS share
  WHERE share.owner_id = invited_owner_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_household_share()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.household_shares
  SET member_id = NULL,
      status = 'revoked',
      accepted_at = NULL,
      invite_token = gen_random_uuid(),
      updated_at = now()
  WHERE owner_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_household_share(p_owner_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.household_shares
  SET member_id = NULL,
      status = 'revoked',
      accepted_at = NULL,
      invite_token = gen_random_uuid(),
      updated_at = now()
  WHERE owner_id = p_owner_id
    AND member_id = auth.uid()
    AND status = 'accepted';
END;
$$;

REVOKE ALL ON FUNCTION public.create_household_invite(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_household_invite(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_household_share() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leave_household_share(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_household_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_household_invite(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_household_share() TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_household_share(UUID) TO authenticated;

-- Notifications belong to the signed-in person, not to the financial space.
-- Backfill the existing mixed-purpose budget columns, then remove client
-- column privileges from those legacy fields so a household member cannot
-- read or change another person's notification preferences.
CREATE TABLE public.user_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_reminder_hour SMALLINT CHECK (
    daily_reminder_hour IS NULL
    OR daily_reminder_hour BETWEEN 0 AND 23
  ),
  notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.user_notification_settings (
  user_id,
  daily_reminder_hour,
  notification_preferences
)
SELECT
  user_id,
  daily_reminder_hour,
  notification_preferences
FROM public.user_budgets
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their notification settings"
  ON public.user_notification_settings
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.user_notification_settings
  FROM anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_notification_settings
  TO authenticated, service_role;

REVOKE SELECT, INSERT, UPDATE ON TABLE public.user_budgets FROM authenticated;
GRANT SELECT (
  id,
  user_id,
  monthly_amount,
  default_savings_pct,
  default_currency,
  created_at,
  updated_at
) ON public.user_budgets TO authenticated;
GRANT INSERT (
  user_id,
  monthly_amount,
  default_savings_pct,
  default_currency
) ON public.user_budgets TO authenticated;
GRANT UPDATE (
  monthly_amount,
  default_savings_pct,
  default_currency,
  updated_at
) ON public.user_budgets TO authenticated;

-- Record who created an expense without changing the owner of the shared row.
ALTER TABLE public.expenses
  ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
UPDATE public.expenses SET created_by = user_id WHERE created_by IS NULL;
ALTER TABLE public.expenses ALTER COLUMN created_by SET DEFAULT auth.uid();
CREATE INDEX expenses_created_by_idx ON public.expenses (created_by);

CREATE OR REPLACE FUNCTION private.prevent_expense_creator_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by
     AND NOT (NEW.created_by IS NULL AND pg_trigger_depth() > 1) THEN
    RAISE EXCEPTION 'Expense creator cannot be changed'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prevent_expense_creator_change()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER expenses_keep_creator
  BEFORE UPDATE OF created_by ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION private.prevent_expense_creator_change();

-- Replace every owner-only finance policy with a household-aware equivalent.
-- Explicit per-table checks preserve cross-reference ownership now that a
-- partner can see both their own space and the shared owner's space.
DO $$
DECLARE
  target_table TEXT;
  target_policy TEXT;
  finance_tables CONSTANT TEXT[] := ARRAY[
    'categories',
    'tags',
    'expenses',
    'recurring_expenses',
    'expense_templates',
    'user_budgets',
    'category_budgets',
    'accounts',
    'account_balances',
    'debts',
    'goals',
    'no_spend_days',
    'expense_tags'
  ];
BEGIN
  FOREACH target_table IN ARRAY finance_tables LOOP
    FOR target_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = target_table
    LOOP
      EXECUTE format(
        'DROP POLICY %I ON public.%I',
        target_policy,
        target_table
      );
    END LOOP;
  END LOOP;
END;
$$;

CREATE POLICY "Household can manage categories"
  ON public.categories FOR ALL TO authenticated
  USING ((SELECT private.can_access_financial_space(user_id)))
  WITH CHECK ((SELECT private.can_access_financial_space(user_id)));

CREATE POLICY "Household can manage tags"
  ON public.tags FOR ALL TO authenticated
  USING ((SELECT private.can_access_financial_space(user_id)))
  WITH CHECK ((SELECT private.can_access_financial_space(user_id)));

CREATE POLICY "Household can manage expenses"
  ON public.expenses FOR ALL TO authenticated
  USING ((SELECT private.can_access_financial_space(user_id)))
  WITH CHECK (
    (SELECT private.can_access_financial_space(user_id))
    AND created_by = (SELECT auth.uid())
    AND (
      category_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.categories AS category
        WHERE category.id = category_id
          AND category.user_id = expenses.user_id
      )
    )
    AND (
      tag_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.tags AS tag
        WHERE tag.id = tag_id
          AND tag.user_id = expenses.user_id
      )
    )
    AND (
      recurring_expense_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.recurring_expenses AS recurring
        WHERE recurring.id = recurring_expense_id
          AND recurring.user_id = expenses.user_id
      )
    )
    AND (
      debt_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.debts AS debt
        WHERE debt.id = debt_id
          AND debt.user_id = expenses.user_id
      )
    )
  );

-- Updates must retain the original creator. The trigger above enforces that;
-- the WITH CHECK intentionally does not require the editor to be that creator.
DROP POLICY "Household can manage expenses" ON public.expenses;
CREATE POLICY "Household can view expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING ((SELECT private.can_access_financial_space(user_id)));
CREATE POLICY "Household can create expenses"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.can_access_financial_space(user_id))
    AND created_by = (SELECT auth.uid())
    AND (category_id IS NULL OR EXISTS (
      SELECT 1 FROM public.categories AS category
      WHERE category.id = category_id AND category.user_id = expenses.user_id
    ))
    AND (tag_id IS NULL OR EXISTS (
      SELECT 1 FROM public.tags AS tag
      WHERE tag.id = tag_id AND tag.user_id = expenses.user_id
    ))
    AND (recurring_expense_id IS NULL OR EXISTS (
      SELECT 1 FROM public.recurring_expenses AS recurring
      WHERE recurring.id = recurring_expense_id AND recurring.user_id = expenses.user_id
    ))
    AND (debt_id IS NULL OR EXISTS (
      SELECT 1 FROM public.debts AS debt
      WHERE debt.id = debt_id AND debt.user_id = expenses.user_id
    ))
  );
CREATE POLICY "Household can update expenses"
  ON public.expenses FOR UPDATE TO authenticated
  USING ((SELECT private.can_access_financial_space(user_id)))
  WITH CHECK (
    (SELECT private.can_access_financial_space(user_id))
    AND (category_id IS NULL OR EXISTS (
      SELECT 1 FROM public.categories AS category
      WHERE category.id = category_id AND category.user_id = expenses.user_id
    ))
    AND (tag_id IS NULL OR EXISTS (
      SELECT 1 FROM public.tags AS tag
      WHERE tag.id = tag_id AND tag.user_id = expenses.user_id
    ))
    AND (recurring_expense_id IS NULL OR EXISTS (
      SELECT 1 FROM public.recurring_expenses AS recurring
      WHERE recurring.id = recurring_expense_id AND recurring.user_id = expenses.user_id
    ))
    AND (debt_id IS NULL OR EXISTS (
      SELECT 1 FROM public.debts AS debt
      WHERE debt.id = debt_id AND debt.user_id = expenses.user_id
    ))
  );
CREATE POLICY "Household can delete expenses"
  ON public.expenses FOR DELETE TO authenticated
  USING ((SELECT private.can_access_financial_space(user_id)));

CREATE POLICY "Household can manage recurring expenses"
  ON public.recurring_expenses FOR ALL TO authenticated
  USING ((SELECT private.can_access_financial_space(user_id)))
  WITH CHECK (
    (SELECT private.can_access_financial_space(user_id))
    AND (category_id IS NULL OR EXISTS (
      SELECT 1 FROM public.categories AS category
      WHERE category.id = category_id
        AND category.user_id = recurring_expenses.user_id
    ))
    AND (linked_account_id IS NULL OR EXISTS (
      SELECT 1 FROM public.accounts AS account
      WHERE account.id = linked_account_id
        AND account.user_id = recurring_expenses.user_id
    ))
  );

CREATE POLICY "Household can manage templates"
  ON public.expense_templates FOR ALL TO authenticated
  USING ((SELECT private.can_access_financial_space(user_id)))
  WITH CHECK (
    (SELECT private.can_access_financial_space(user_id))
    AND (category_id IS NULL OR EXISTS (
      SELECT 1 FROM public.categories AS category
      WHERE category.id = category_id
        AND category.user_id = expense_templates.user_id
    ))
    AND (tag_id IS NULL OR EXISTS (
      SELECT 1 FROM public.tags AS tag
      WHERE tag.id = tag_id
        AND tag.user_id = expense_templates.user_id
    ))
  );

CREATE POLICY "Household can manage budget settings"
  ON public.user_budgets FOR ALL TO authenticated
  USING ((SELECT private.can_access_financial_space(user_id)))
  WITH CHECK ((SELECT private.can_access_financial_space(user_id)));

CREATE POLICY "Household can manage category budgets"
  ON public.category_budgets FOR ALL TO authenticated
  USING ((SELECT private.can_access_financial_space(user_id)))
  WITH CHECK (
    (SELECT private.can_access_financial_space(user_id))
    AND EXISTS (
      SELECT 1 FROM public.categories AS category
      WHERE category.id = category_id
        AND category.user_id = category_budgets.user_id
    )
  );

CREATE POLICY "Household can manage accounts"
  ON public.accounts FOR ALL TO authenticated
  USING ((SELECT private.can_access_financial_space(user_id)))
  WITH CHECK ((SELECT private.can_access_financial_space(user_id)));

CREATE POLICY "Household can manage account balances"
  ON public.account_balances FOR ALL TO authenticated
  USING ((SELECT private.can_access_financial_space(user_id)))
  WITH CHECK (
    (SELECT private.can_access_financial_space(user_id))
    AND EXISTS (
      SELECT 1 FROM public.accounts AS account
      WHERE account.id = account_id
        AND account.user_id = account_balances.user_id
    )
  );

CREATE POLICY "Household can manage debts"
  ON public.debts FOR ALL TO authenticated
  USING ((SELECT private.can_access_financial_space(user_id)))
  WITH CHECK ((SELECT private.can_access_financial_space(user_id)));

CREATE POLICY "Household can manage goals"
  ON public.goals FOR ALL TO authenticated
  USING ((SELECT private.can_access_financial_space(user_id)))
  WITH CHECK (
    (SELECT private.can_access_financial_space(user_id))
    AND (category_id IS NULL OR EXISTS (
      SELECT 1 FROM public.categories AS category
      WHERE category.id = category_id AND category.user_id = goals.user_id
    ))
    AND (tag_id IS NULL OR EXISTS (
      SELECT 1 FROM public.tags AS tag
      WHERE tag.id = tag_id AND tag.user_id = goals.user_id
    ))
  );

CREATE POLICY "Household can manage no-spend days"
  ON public.no_spend_days FOR ALL TO authenticated
  USING ((SELECT private.can_access_financial_space(user_id)))
  WITH CHECK ((SELECT private.can_access_financial_space(user_id)));

CREATE POLICY "Household can manage expense tags"
  ON public.expense_tags FOR ALL TO authenticated
  USING ((SELECT private.can_access_financial_space(user_id)))
  WITH CHECK (
    (SELECT private.can_access_financial_space(user_id))
    AND EXISTS (
      SELECT 1 FROM public.expenses AS expense
      WHERE expense.id = expense_id
        AND expense.user_id = expense_tags.user_id
    )
    AND EXISTS (
      SELECT 1 FROM public.tags AS tag
      WHERE tag.id = tag_id
        AND tag.user_id = expense_tags.user_id
    )
  );

-- Existing helper functions predate spaces and either relied on auth.uid()
-- defaults or filtered explicitly to the caller. Teach them to derive or
-- accept the financial owner while preserving their existing signatures where
-- current clients call them directly.
CREATE OR REPLACE FUNCTION public.upsert_account_balance(
  p_account_id UUID,
  p_balance NUMERIC,
  p_contribution_delta NUMERIC DEFAULT NULL,
  p_recorded_at DATE DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_original_amount NUMERIC DEFAULT NULL,
  p_original_currency TEXT DEFAULT NULL,
  p_exchange_rate NUMERIC DEFAULT NULL
)
RETURNS public.account_balances
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_owner_id UUID;
  v_row public.account_balances;
BEGIN
  SELECT account.user_id
  INTO v_owner_id
  FROM public.accounts AS account
  WHERE account.id = p_account_id
    AND private.can_access_financial_space(account.user_id);

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Account not found' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.account_balances AS balance_row (
    account_id,
    user_id,
    balance,
    contribution_delta,
    recorded_at,
    note,
    original_amount,
    original_currency,
    exchange_rate
  )
  VALUES (
    p_account_id,
    v_owner_id,
    p_balance,
    p_contribution_delta,
    COALESCE(p_recorded_at, CURRENT_DATE),
    p_note,
    p_original_amount,
    p_original_currency,
    p_exchange_rate
  )
  ON CONFLICT (account_id, recorded_at) DO UPDATE SET
    balance = EXCLUDED.balance,
    contribution_delta = CASE
      WHEN balance_row.contribution_delta IS NULL
        AND EXCLUDED.contribution_delta IS NULL THEN NULL
      ELSE COALESCE(balance_row.contribution_delta, 0)
        + COALESCE(EXCLUDED.contribution_delta, 0)
    END,
    note = COALESCE(EXCLUDED.note, balance_row.note),
    original_amount = EXCLUDED.original_amount,
    original_currency = EXCLUDED.original_currency,
    exchange_rate = EXCLUDED.exchange_rate
  RETURNING balance_row.* INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.merge_category(
  p_from_category_id UUID,
  p_to_category_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_owner_id UUID;
  v_from_type TEXT;
  v_to_type TEXT;
  v_moved INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_from_category_id = p_to_category_id THEN
    RAISE EXCEPTION 'Cannot merge a category into itself'
      USING ERRCODE = '22023';
  END IF;

  SELECT category.user_id, category.type
  INTO v_owner_id, v_from_type
  FROM public.categories AS category
  WHERE category.id = p_from_category_id
    AND private.can_access_financial_space(category.user_id);

  SELECT category.type
  INTO v_to_type
  FROM public.categories AS category
  WHERE category.id = p_to_category_id
    AND category.user_id = v_owner_id;

  IF v_owner_id IS NULL OR v_to_type IS NULL THEN
    RAISE EXCEPTION 'Category not found' USING ERRCODE = '42501';
  END IF;

  IF v_from_type <> v_to_type THEN
    RAISE EXCEPTION 'Cannot merge categories of different types'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.expenses
  SET category_id = p_to_category_id
  WHERE category_id = p_from_category_id
    AND user_id = v_owner_id;
  GET DIAGNOSTICS v_moved = ROW_COUNT;

  DELETE FROM public.categories
  WHERE id = p_from_category_id
    AND user_id = v_owner_id;

  RETURN v_moved;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_debt_balances(p_owner_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  debt_row RECORD;
  refreshed_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL
     OR NOT private.can_access_financial_space(p_owner_id) THEN
    RAISE EXCEPTION 'Not authorized for this financial space'
      USING ERRCODE = '42501';
  END IF;

  FOR debt_row IN
    SELECT debt.id
    FROM public.debts AS debt
    WHERE debt.user_id = p_owner_id
      AND debt.is_archived = false
      AND debt.is_completed = false
      AND debt.current_balance > 0
      AND debt.apr > 0
      AND debt.updated_at < date_trunc('day', now())
  LOOP
    PERFORM public.recompute_debt_balance(debt_row.id);
    refreshed_count := refreshed_count + 1;
  END LOOP;

  RETURN refreshed_count;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_debt_balances(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_debt_balances(UUID)
  TO authenticated, service_role;

COMMENT ON TABLE public.household_shares IS
  'One optional Pro household member; finance rows remain owned by owner_id.';
COMMENT ON COLUMN public.expenses.created_by IS
  'Authenticated actor who originally created this shared-space expense.';
