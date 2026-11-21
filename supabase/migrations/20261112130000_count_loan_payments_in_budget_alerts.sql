-- Budget alerts count what the budget ring counts.
--
-- The ring on Today takes three things off the monthly budget: spending,
-- money set aside for savings outside spending, and loan payments. These two
-- helpers summed spending alone, so the 80% and 100% pushes fired later than
-- the figure on screen for anyone paying a loan or investing through a goal.
--
-- The rules are src/common/hooks/useMonthlyPosition.ts and
-- src/constants/debtOutflow.ts in SQL, and they must agree:
--   spending is an expense row that is not excluded
--   a set-aside is an excluded expense row with a goal or a savings category
--   a credit card payment is a transfer, its purchases are already expenses
--   a debt in another currency is left out, there is no rate to convert with
--   an archived debt is left out, the app does not load it
-- Category budget alerts are unchanged, a loan payment has no category.

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
      AND (
        (e.type = 'expense' AND e.is_excluded = false)
        OR (
          e.type = 'expense'
          AND e.is_excluded = true
          AND (
            e.goal_id IS NOT NULL
            OR EXISTS (
              SELECT 1 FROM categories c
              WHERE c.id = e.category_id
                AND c.kind = 'savings'
            )
          )
        )
        OR (
          e.type = 'debt_payment'
          AND EXISTS (
            SELECT 1 FROM debts d
            WHERE d.id = e.debt_id
              AND d.user_id = e.user_id
              AND d.kind <> 'credit_card'
              AND d.is_archived = false
              AND d.currency = COALESCE(ub.default_currency, 'EUR')
          )
        )
      )
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

REVOKE EXECUTE ON FUNCTION public.get_users_crossed_budget(DATE, DATE) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_users_crossed_budget(DATE, DATE) TO service_role;

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
      AND (
        (e.type = 'expense' AND e.is_excluded = false)
        OR (
          e.type = 'expense'
          AND e.is_excluded = true
          AND (
            e.goal_id IS NOT NULL
            OR EXISTS (
              SELECT 1 FROM categories c
              WHERE c.id = e.category_id
                AND c.kind = 'savings'
            )
          )
        )
        OR (
          e.type = 'debt_payment'
          AND EXISTS (
            SELECT 1 FROM debts d
            WHERE d.id = e.debt_id
              AND d.user_id = e.user_id
              AND d.kind <> 'credit_card'
              AND d.is_archived = false
              AND d.currency = COALESCE(ub.default_currency, 'EUR')
          )
        )
      )
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
    AND t.total_today    <  t.monthly_amount;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_users_approaching_budget(DATE, DATE) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_users_approaching_budget(DATE, DATE) TO service_role;
