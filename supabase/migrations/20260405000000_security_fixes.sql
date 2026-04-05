-- Security fixes for SECURITY DEFINER functions
--
-- VULNERABILITIES FIXED:
--
-- 1. process_recurring_expenses: SECURITY DEFINER + callable without auth + p_user_id IS NULL
--    clause meant anyone could trigger generation of expenses for ALL users, including
--    with arbitrary future dates (e.g. p_target_date = '2099-01-01').
--
-- 2. get_upcoming_recurring_expenses: SECURITY DEFINER + accepts arbitrary p_user_id
--    with no auth check. Anyone knowing a user's UUID could read their private
--    recurring expense schedule.
--
-- 3. generate_recurring_expenses: exposed via PostgREST REST API without restriction.
--    Revoke execute from anon and authenticated (only needed by internal triggers).
--
-- FIX STRATEGY:
-- - Require auth.uid() != NULL at the top of both SECURITY DEFINER functions.
-- - Scope process_recurring_expenses to auth.uid() only (ignore p_user_id).
-- - Validate p_user_id == auth.uid() in get_upcoming_recurring_expenses.
-- - Cap p_target_date to CURRENT_DATE + 1 year to prevent bulk future generation.
-- - Revoke PostgREST access to generate_recurring_expenses.


-- ============================================================================
-- Fix 1: process_recurring_expenses
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_recurring_expenses(
  p_user_id uuid DEFAULT NULL::uuid,
  p_target_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(generated_count integer, processed_recurring_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id UUID;
  v_recurring RECORD;
  v_next_date DATE;
  v_generated_count INT := 0;
  v_processed_ids UUID[] := ARRAY[]::UUID[];
  v_new_expense_id UUID;
  v_iteration_limit INT := 52; -- Max iterations per recurring expense (~1 year weekly)
  v_iteration_count INT;
  v_existing_count INT;
BEGIN
  -- Require authentication: SECURITY DEFINER bypasses RLS, so we must check manually.
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Prevent generating expenses far into the future (abuse prevention).
  IF p_target_date > CURRENT_DATE + INTERVAL '1 year' THEN
    RAISE EXCEPTION 'target_date cannot be more than 1 year in the future';
  END IF;

  -- Always scope to the authenticated caller. The p_user_id parameter is kept
  -- for API compatibility but is ignored — callers can only process their own data.
  FOR v_recurring IN
    SELECT re.*
    FROM recurring_expenses re
    WHERE re.user_id = v_caller_id
      AND re.active = true
      AND re.start_date <= p_target_date
      AND (re.end_date IS NULL OR re.end_date >= p_target_date)
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
      SELECT COUNT(*) INTO v_existing_count
      FROM expenses
      WHERE recurring_expense_id = v_recurring.id
        AND date = v_next_date;

      IF v_existing_count = 0 THEN
        INSERT INTO expenses (
          user_id,
          amount,
          description,
          date,
          category_id,
          recurring_expense_id
        ) VALUES (
          v_recurring.user_id,
          v_recurring.amount,
          v_recurring.description,
          v_next_date,
          v_recurring.category_id,
          v_recurring.id
        )
        RETURNING id INTO v_new_expense_id;

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


-- ============================================================================
-- Fix 2: get_upcoming_recurring_expenses
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_upcoming_recurring_expenses(
  p_user_id uuid,
  p_days_ahead integer DEFAULT 30
)
RETURNS TABLE(
  recurring_expense_id uuid,
  description text,
  amount numeric,
  category_id uuid,
  next_occurrence date,
  frequency text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id UUID;
  v_target_date DATE := CURRENT_DATE + (p_days_ahead || ' days')::INTERVAL;
BEGIN
  -- Require authentication: SECURITY DEFINER bypasses RLS, so we must check manually.
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Callers may only query their own data.
  IF p_user_id != v_caller_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    re.id AS recurring_expense_id,
    re.description,
    re.amount,
    re.category_id,
    CASE
      WHEN re.last_generated_date IS NOT NULL THEN
        calculate_next_occurrence(re.frequency, re.last_generated_date, re.start_date)
      ELSE
        re.start_date
    END AS next_occurrence,
    re.frequency
  FROM recurring_expenses re
  WHERE re.user_id = v_caller_id
    AND re.active = true
    AND re.start_date <= v_target_date
    AND (re.end_date IS NULL OR re.end_date >= CURRENT_DATE)
    AND CASE
      WHEN re.last_generated_date IS NOT NULL THEN
        calculate_next_occurrence(re.frequency, re.last_generated_date, re.start_date)
      ELSE
        re.start_date
    END <= v_target_date
  ORDER BY next_occurrence;
END;
$function$;


-- ============================================================================
-- Fix 3: revoke PostgREST access to generate_recurring_expenses
-- (It is only meant to be called by the check_recurring_expenses trigger.)
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.generate_recurring_expenses() FROM anon, authenticated;
