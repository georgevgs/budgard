-- The daily cron `process-recurring-expenses-daily` was calling
-- process_recurring_expenses(NULL, CURRENT_DATE), but the 2026-04-05 security
-- fix added an `auth.uid() IS NULL → RAISE 'Not authenticated'` check to that
-- function. Cron runs as postgres (no JWT, no auth.uid()), so every daily run
-- has been failing silently since April 5 — recurring expenses stopped
-- generating on time.
--
-- Fix: introduce a dedicated cron-only function that processes all users.
-- Same defence-in-depth pattern as get_recurring_due_on: SECURITY DEFINER,
-- caller restricted to service_role/postgres, EXECUTE revoked from PUBLIC.

CREATE OR REPLACE FUNCTION public.process_all_recurring_expenses(
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(generated_count INTEGER, processed_recurring_ids UUID[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_recurring RECORD;
  v_next_date DATE;
  v_generated_count INT := 0;
  v_processed_ids UUID[] := ARRAY[]::UUID[];
  v_iteration_limit INT := 52;
  v_iteration_count INT;
  v_existing_count INT;
BEGIN
  -- Cron-only helper. Block any caller other than service_role/postgres even
  -- if a future grant accidentally re-exposes EXECUTE to anon/authenticated.
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
      AND (re.end_date IS NULL OR re.end_date >= p_target_date)
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
        );

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

REVOKE EXECUTE ON FUNCTION public.process_all_recurring_expenses(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_all_recurring_expenses(DATE) TO service_role;

-- Repoint the daily cron at the new function.
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'process-recurring-expenses-daily'),
  command := 'SELECT process_all_recurring_expenses(CURRENT_DATE)'
);
