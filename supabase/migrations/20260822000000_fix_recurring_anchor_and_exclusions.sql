-- Numbers audit, Aug 2026 — server side.
--
-- Three unrelated classes of wrong number, all in scheduled/aggregate SQL:
--
--   1. Recurring occurrences drifted off their anchor day. `date + interval
--      '1 month'` clamps Jan 31 to Feb 28, and the next occurrence was then
--      computed FROM the clamped date — so a rent bill on the 31st became a
--      bill on the 28th, permanently, after its first February. Both
--      generators had it. calculate_next_occurrence already received
--      p_start_date and ignored it; it is now the anchor.
--
--   2. A schedule that ended mid-month never generated its final
--      occurrences. The cron's outer filter demanded end_date >= target, so a
--      schedule ending on the 10th was skipped entirely from the 11th onward
--      — including the occurrence due on the 5th that had not been generated
--      yet. The inner WHILE loop already guards end_date correctly, so the
--      outer filter only needs to keep rows with ungenerated history.
--
--   3. `is_excluded` (20260821180000) was never applied to the push helpers.
--      Every "you crossed your budget" notification counted transfers the
--      user had explicitly marked as not-spending, so the push and the app
--      disagreed. The weekly recap was worse: it filtered only
--      <> 'debt_payment', so income rows counted as money spent.

-- ============================================================================
-- 1. Occurrence dates anchor on the schedule's start day-of-month
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_next_occurrence(
  p_frequency  TEXT,
  p_from_date  DATE,
  p_start_date DATE
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_months        INT;
  v_anchor_day    INT;
  v_month_start   DATE;
  v_days_in_month INT;
BEGIN
  IF p_from_date < p_start_date THEN
    RETURN p_start_date;
  END IF;

  -- Week-based cadences are exact intervals; there is no month to clamp into.
  IF p_frequency = 'weekly' THEN
    RETURN p_from_date + INTERVAL '7 days';
  END IF;

  IF p_frequency = 'biweekly' THEN
    RETURN p_from_date + INTERVAL '14 days';
  END IF;

  v_months := CASE p_frequency
    WHEN 'quarterly' THEN 3
    WHEN 'yearly'    THEN 12
    ELSE 1
  END;

  -- The anchor is the start date's day-of-month, NOT the previous
  -- occurrence's. Clamping into a short month is then a per-occurrence
  -- adjustment that the following month recovers from, rather than a
  -- permanent shift: 31 Jan → 28 Feb → 31 Mar.
  v_anchor_day  := EXTRACT(DAY FROM p_start_date)::INT;
  v_month_start := (
    date_trunc('month', p_from_date) + (v_months || ' months')::INTERVAL
  )::DATE;
  v_days_in_month := EXTRACT(
    DAY FROM (date_trunc('month', v_month_start) + INTERVAL '1 month - 1 day')
  )::INT;

  RETURN v_month_start + (LEAST(v_anchor_day, v_days_in_month) - 1);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.calculate_next_occurrence(TEXT, DATE, DATE) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.calculate_next_occurrence(TEXT, DATE, DATE) TO service_role;


-- ============================================================================
-- 2. The edit-time trigger uses the same definition of "next"
--
-- It previously carried its own CASE + interval arithmetic, which is how the
-- two generators drifted apart in the first place. One definition now.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_recurring_expenses()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    next_date  DATE;
    last_date  DATE;
    iterations INT := 0;
BEGIN
    -- Fire on INSERT, or on UPDATE that changes scheduling fields. The
    -- last_generated_date UPDATE below re-fires this trigger but fails this
    -- condition, which is what terminates the recursion.
    IF NOT (
        TG_OP = 'INSERT'
        OR (TG_OP = 'UPDATE' AND (
            NEW.active <> OLD.active
            OR NEW.start_date <> OLD.start_date
            OR NEW.frequency <> OLD.frequency
        ))
    ) THEN
        RETURN NEW;
    END IF;

    IF NEW.active IS DISTINCT FROM true THEN
        RETURN NEW;
    END IF;

    IF NEW.last_generated_date IS NOT NULL THEN
        next_date := public.calculate_next_occurrence(
            NEW.frequency, NEW.last_generated_date, NEW.start_date
        );
    ELSE
        next_date := NEW.start_date;
    END IF;

    WHILE next_date <= CURRENT_DATE
      AND iterations < 52
      AND (NEW.end_date IS NULL OR next_date <= NEW.end_date)
    LOOP
        INSERT INTO public.expenses (
            amount, description, category_id, date, user_id,
            recurring_expense_id, type
        ) VALUES (
            NEW.amount, NEW.description, NEW.category_id, next_date,
            NEW.user_id, NEW.id, NEW.type
        )
        ON CONFLICT ON CONSTRAINT expenses_recurring_date_unique DO NOTHING;

        last_date  := next_date;
        iterations := iterations + 1;
        next_date  := public.calculate_next_occurrence(
            NEW.frequency, next_date, NEW.start_date
        );
    END LOOP;

    IF last_date IS NOT NULL THEN
        UPDATE public.recurring_expenses
        SET last_generated_date = last_date
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.check_recurring_expenses() FROM PUBLIC, anon, authenticated;


-- ============================================================================
-- 3. Cron: pick up schedules that ended between runs; never abort on a race
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_all_recurring_expenses(
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(generated_count INTEGER, processed_recurring_ids UUID[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_recurring       RECORD;
  v_next_date       DATE;
  v_generated_count INT := 0;
  v_processed_ids   UUID[] := ARRAY[]::UUID[];
  v_iteration_limit INT := 52;
  v_iteration_count INT;
  v_inserted        INT;
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND current_user NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_target_date > CURRENT_DATE + INTERVAL '1 year' THEN
    RAISE EXCEPTION 'target_date cannot be more than 1 year in the future';
  END IF;

  FOR v_recurring IN
    SELECT re.*
    FROM recurring_expenses re
    WHERE re.active = true
      AND re.start_date <= p_target_date
      -- An ended schedule may still owe occurrences between its last
      -- generated date and its end date. Comparing end_date to the target
      -- date dropped those silently; comparing it to the point generation
      -- actually reached keeps them. The WHILE loop below still refuses to
      -- generate past end_date.
      AND (
        re.end_date IS NULL
        OR re.end_date >= COALESCE(re.last_generated_date, re.start_date)
      )
    ORDER BY re.user_id, re.created_at
    FOR UPDATE SKIP LOCKED
  LOOP
    v_iteration_count := 0;

    IF v_recurring.last_generated_date IS NOT NULL THEN
      v_next_date := calculate_next_occurrence(
        v_recurring.frequency,
        v_recurring.last_generated_date,
        v_recurring.start_date
      );
    ELSE
      v_next_date := v_recurring.start_date;
    END IF;

    WHILE v_next_date <= p_target_date
      AND v_iteration_count < v_iteration_limit
      AND (v_recurring.end_date IS NULL OR v_next_date <= v_recurring.end_date)
    LOOP
      -- Let the unique constraint arbitrate rather than a read-then-write,
      -- which two concurrent runs can both pass before either inserts.
      INSERT INTO expenses (
        user_id, amount, description, date,
        category_id, recurring_expense_id, type
      ) VALUES (
        v_recurring.user_id, v_recurring.amount, v_recurring.description,
        v_next_date, v_recurring.category_id, v_recurring.id, v_recurring.type
      )
      ON CONFLICT ON CONSTRAINT expenses_recurring_date_unique DO NOTHING;

      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      IF v_inserted > 0 THEN
        v_generated_count := v_generated_count + 1;
      END IF;

      UPDATE recurring_expenses
      SET last_generated_date = v_next_date
      WHERE id = v_recurring.id;

      v_iteration_count := v_iteration_count + 1;

      v_next_date := calculate_next_occurrence(
        v_recurring.frequency,
        v_next_date,
        v_recurring.start_date
      );
    END LOOP;

    IF v_iteration_count > 0 THEN
      v_processed_ids := array_append(v_processed_ids, v_recurring.id);
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_generated_count, v_processed_ids;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.process_all_recurring_expenses(DATE) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.process_all_recurring_expenses(DATE) TO service_role;


CREATE OR REPLACE FUNCTION public.process_recurring_expenses(
  p_user_id     UUID DEFAULT NULL::UUID,
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(generated_count INTEGER, processed_recurring_ids UUID[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id       UUID;
  v_recurring       RECORD;
  v_next_date       DATE;
  v_generated_count INT := 0;
  v_processed_ids   UUID[] := ARRAY[]::UUID[];
  v_iteration_limit INT := 52;
  v_iteration_count INT;
  v_inserted        INT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_target_date > CURRENT_DATE + INTERVAL '1 year' THEN
    RAISE EXCEPTION 'target_date cannot be more than 1 year in the future';
  END IF;

  FOR v_recurring IN
    SELECT re.*
    FROM recurring_expenses re
    WHERE re.user_id = v_caller_id
      AND re.active = true
      AND re.start_date <= p_target_date
      AND (
        re.end_date IS NULL
        OR re.end_date >= COALESCE(re.last_generated_date, re.start_date)
      )
    ORDER BY re.created_at
    FOR UPDATE SKIP LOCKED
  LOOP
    v_iteration_count := 0;

    IF v_recurring.last_generated_date IS NOT NULL THEN
      v_next_date := calculate_next_occurrence(
        v_recurring.frequency,
        v_recurring.last_generated_date,
        v_recurring.start_date
      );
    ELSE
      v_next_date := v_recurring.start_date;
    END IF;

    WHILE v_next_date <= p_target_date
      AND v_iteration_count < v_iteration_limit
      AND (v_recurring.end_date IS NULL OR v_next_date <= v_recurring.end_date)
    LOOP
      INSERT INTO expenses (
        user_id, amount, description, date,
        category_id, recurring_expense_id, type
      ) VALUES (
        v_recurring.user_id, v_recurring.amount, v_recurring.description,
        v_next_date, v_recurring.category_id, v_recurring.id, v_recurring.type
      )
      ON CONFLICT ON CONSTRAINT expenses_recurring_date_unique DO NOTHING;

      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      IF v_inserted > 0 THEN
        v_generated_count := v_generated_count + 1;
      END IF;

      UPDATE recurring_expenses
      SET last_generated_date = v_next_date
      WHERE id = v_recurring.id;

      v_iteration_count := v_iteration_count + 1;

      v_next_date := calculate_next_occurrence(
        v_recurring.frequency,
        v_next_date,
        v_recurring.start_date
      );
    END LOOP;

    IF v_iteration_count > 0 THEN
      v_processed_ids := array_append(v_processed_ids, v_recurring.id);
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_generated_count, v_processed_ids;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.process_recurring_expenses(UUID, DATE) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.process_recurring_expenses(UUID, DATE) TO authenticated, service_role;


-- ============================================================================
-- 4. Push helpers honour is_excluded — and the recap counts spending only
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
      AND e.is_excluded = false
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
      AND e.type = 'expense'
      AND e.is_excluded = false
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
      AND e.is_excluded = false
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

REVOKE EXECUTE ON FUNCTION public.get_users_crossed_category_budget(DATE, DATE) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_users_crossed_category_budget(DATE, DATE) TO service_role;


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
      AND e.is_excluded = false
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

REVOKE EXECUTE ON FUNCTION public.get_users_approaching_category_budget(DATE, DATE) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_users_approaching_category_budget(DATE, DATE) TO service_role;


-- The recap said "you spent €X this week" while summing income alongside
-- expenses. It now uses the same definition of spending as lib/spending.ts:
-- type = 'expense', not excluded.
CREATE OR REPLACE FUNCTION public.get_weekly_recap_push_users(p_window_end DATE)
RETURNS TABLE(
  user_id          UUID,
  week_total       NUMERIC,
  default_currency TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.user_id,
    COALESCE(SUM(e.amount), 0)::numeric AS week_total,
    COALESCE(ub.default_currency, 'EUR') AS default_currency
  FROM push_subscriptions ps
  LEFT JOIN user_budgets ub ON ub.user_id = ps.user_id
  LEFT JOIN expenses e
    ON e.user_id = ps.user_id
    AND e.date BETWEEN (p_window_end - INTERVAL '6 days') AND p_window_end
    AND COALESCE(e.type, 'expense') = 'expense'
    AND e.is_excluded = false
  GROUP BY ps.user_id, ub.default_currency
  HAVING COALESCE(SUM(e.amount), 0) > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_weekly_recap_push_users(DATE) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_weekly_recap_push_users(DATE) TO service_role;


-- ============================================================================
-- 5. Debt payment reminders survive short months
--
-- The T-1 reminder matched EXTRACT(DAY FROM start_date) against the target
-- day, so a debt billed on the 31st was never reminded in February, April,
-- June, September or November. The billing day now clamps to the month's
-- length, the same rule the occurrence calendar uses.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_debt_payments_due_on(
  p_target_date DATE
)
RETURNS TABLE(
  user_id         UUID,
  debt_id         UUID,
  debt_name       TEXT,
  minimum_payment NUMERIC,
  currency        TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_days_in_month INT;
BEGIN
  v_days_in_month := EXTRACT(
    DAY FROM (date_trunc('month', p_target_date) + INTERVAL '1 month - 1 day')
  )::INT;

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
    AND LEAST(EXTRACT(DAY FROM d.start_date)::INT, v_days_in_month)
        = EXTRACT(DAY FROM p_target_date)::INT
    AND NOT EXISTS (
      SELECT 1 FROM expenses e
      WHERE e.debt_id = d.id
        AND e.type = 'debt_payment'
        AND e.date >= date_trunc('month', p_target_date)::date
        AND e.date <  (date_trunc('month', p_target_date) + INTERVAL '1 month')::date
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_debt_payments_due_on(DATE) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_debt_payments_due_on(DATE) TO service_role;
