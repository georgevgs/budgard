-- Helpers for budget-exceeded push notifications. Scoped to users with push
-- subscriptions; idempotent without a state table by detecting the *day the
-- threshold is first crossed* (total_today >= cap AND total_yesterday < cap).
--
-- Same defence-in-depth pattern as the other cron helpers: SECURITY DEFINER,
-- SET search_path = public, REVOKE from PUBLIC/anon/authenticated, GRANT only
-- to service_role.
--
-- Mirrors the client-side budget math: only rows where `expenses.type = 'expense'`
-- count toward the cap (income and debt_payment are excluded — see dataService
-- `getExpenses` filter and `useCurrentMonthSpendingByCategory`).

-- ============================================================================
-- Global monthly budget — fires the day total crosses user_budgets.monthly_amount.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_users_crossed_budget(
  p_today     DATE,
  p_yesterday DATE
)
RETURNS TABLE(
  user_id          UUID,
  monthly_amount   NUMERIC,
  current_total    NUMERIC,
  default_currency TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH push_users AS (
    SELECT DISTINCT ps.user_id FROM push_subscriptions ps
  ),
  totals AS (
    SELECT
      ub.user_id,
      ub.monthly_amount,
      COALESCE(ub.default_currency, 'EUR') AS default_currency,
      COALESCE(SUM(e.amount) FILTER (WHERE e.date <= p_today), 0)::numeric    AS total_today,
      COALESCE(SUM(e.amount) FILTER (WHERE e.date <= p_yesterday), 0)::numeric AS total_yesterday
    FROM push_users pu
    JOIN user_budgets ub ON ub.user_id = pu.user_id
    LEFT JOIN expenses e
      ON e.user_id = ub.user_id
      AND e.type = 'expense'
      AND e.date >= date_trunc('month', p_today)::date
      AND e.date <= p_today
    GROUP BY ub.user_id, ub.monthly_amount, ub.default_currency
  )
  SELECT
    t.user_id,
    t.monthly_amount,
    t.total_today AS current_total,
    t.default_currency
  FROM totals t
  WHERE t.total_today    >= t.monthly_amount
    AND t.total_yesterday <  t.monthly_amount;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_users_crossed_budget(DATE, DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_users_crossed_budget(DATE, DATE) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_users_crossed_budget(DATE, DATE) TO service_role;


-- ============================================================================
-- Per-category monthly budget — fires the day a category total crosses its cap.
-- Returns category_name so the Edge Function can build a friendly message
-- without an extra round trip.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_users_crossed_category_budget(
  p_today     DATE,
  p_yesterday DATE
)
RETURNS TABLE(
  user_id          UUID,
  category_id      UUID,
  category_name    TEXT,
  monthly_amount   NUMERIC,
  current_total    NUMERIC,
  default_currency TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH push_users AS (
    SELECT DISTINCT ps.user_id FROM push_subscriptions ps
  ),
  cat_totals AS (
    SELECT
      cb.user_id,
      cb.category_id,
      c.name AS category_name,
      cb.monthly_amount,
      COALESCE(ub.default_currency, 'EUR') AS default_currency,
      COALESCE(SUM(e.amount) FILTER (WHERE e.date <= p_today), 0)::numeric    AS total_today,
      COALESCE(SUM(e.amount) FILTER (WHERE e.date <= p_yesterday), 0)::numeric AS total_yesterday
    FROM category_budgets cb
    JOIN push_users pu ON pu.user_id = cb.user_id
    JOIN categories c ON c.id = cb.category_id
    LEFT JOIN user_budgets ub ON ub.user_id = cb.user_id
    LEFT JOIN expenses e
      ON e.user_id = cb.user_id
      AND e.category_id = cb.category_id
      AND e.type = 'expense'
      AND e.date >= date_trunc('month', p_today)::date
      AND e.date <= p_today
    GROUP BY cb.user_id, cb.category_id, c.name, cb.monthly_amount, ub.default_currency
  )
  SELECT
    ct.user_id,
    ct.category_id,
    ct.category_name,
    ct.monthly_amount,
    ct.total_today AS current_total,
    ct.default_currency
  FROM cat_totals ct
  WHERE ct.total_today    >= ct.monthly_amount
    AND ct.total_yesterday <  ct.monthly_amount;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_users_crossed_category_budget(DATE, DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_users_crossed_category_budget(DATE, DATE) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_users_crossed_category_budget(DATE, DATE) TO service_role;
