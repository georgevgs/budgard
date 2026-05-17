-- Push-notification helpers for the early-warning expansion (May 2026):
--   * 80% threshold for the monthly budget and per-category budgets.
--   * Debt minimum-payment T-1 reminder, inferred from debts.start_date
--     day-of-month (no schema/UI change required).
--
-- Same defence-in-depth pattern as the other cron helpers: SECURITY DEFINER,
-- SET search_path = public, REVOKE from PUBLIC/anon/authenticated, GRANT only
-- to service_role. Idempotent without a state table — each helper detects the
-- *day the threshold is first crossed* or the *day before the due date*.

-- ============================================================================
-- Global monthly budget — fires the day the total first crosses 80% of cap.
-- Skips users who *also* crossed 100% today, so they only get the "blown" push.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_users_approaching_budget(
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
  WHERE t.total_today    >= 0.8 * t.monthly_amount
    AND t.total_yesterday <  0.8 * t.monthly_amount
    AND t.total_today    <  t.monthly_amount;  -- crossing 100% is handled by the other helper
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_users_approaching_budget(DATE, DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_users_approaching_budget(DATE, DATE) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_users_approaching_budget(DATE, DATE) TO service_role;


-- ============================================================================
-- Per-category monthly budget — fires the day a category total crosses 80%.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_users_approaching_category_budget(
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
  WHERE ct.total_today    >= 0.8 * ct.monthly_amount
    AND ct.total_yesterday <  0.8 * ct.monthly_amount
    AND ct.total_today    <  ct.monthly_amount;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_users_approaching_category_budget(DATE, DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_users_approaching_category_budget(DATE, DATE) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_users_approaching_category_budget(DATE, DATE) TO service_role;


-- ============================================================================
-- Debt payment T-1 — fires the day before a debt's monthly payment is due.
--
-- Inference (no schema change): day-of-month is taken from `start_date`, which
-- is the user's chosen "billing day" when they create the debt. Skip if a
-- debt_payment expense has already been logged for this debt this month
-- (user paid early — don't nag). Skip archived / completed / zero-balance
-- debts and any debt with minimum_payment = 0.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_debt_payments_due_on(
  p_target_date DATE
)
RETURNS TABLE(
  user_id          UUID,
  debt_id          UUID,
  debt_name        TEXT,
  minimum_payment  NUMERIC,
  currency         TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH push_users AS (
    SELECT DISTINCT ps.user_id FROM push_subscriptions ps
  )
  SELECT
    d.user_id,
    d.id AS debt_id,
    d.name AS debt_name,
    d.minimum_payment,
    d.currency
  FROM debts d
  JOIN push_users pu ON pu.user_id = d.user_id
  WHERE d.is_archived = false
    AND d.is_completed = false
    AND d.current_balance > 0
    AND d.minimum_payment > 0
    AND EXTRACT(DAY FROM d.start_date)::int = EXTRACT(DAY FROM p_target_date)::int
    AND NOT EXISTS (
      SELECT 1 FROM expenses e
      WHERE e.debt_id = d.id
        AND e.type = 'debt_payment'
        AND e.date >= date_trunc('month', p_target_date)::date
        AND e.date <  (date_trunc('month', p_target_date) + INTERVAL '1 month')::date
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_debt_payments_due_on(DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_debt_payments_due_on(DATE) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_debt_payments_due_on(DATE) TO service_role;
