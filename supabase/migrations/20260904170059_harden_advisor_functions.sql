-- Security and lint hardening for the two functions reported by the linked
-- database advisor. Both changes preserve their existing signatures so stale
-- PWA clients keep working.

-- The computed relationship already qualifies every object in its SQL body.
-- Pin an empty search_path so caller-controlled schemas cannot shadow them.
ALTER FUNCTION public.tags(public.expenses) SET search_path = '';

-- p_user_id remains in this legacy RPC for compatibility. It used to be
-- ignored after the RPC was secured around auth.uid(); explicitly validating
-- it keeps those semantics for NULL/the caller while rejecting misleading
-- cross-user requests. All objects are schema-qualified so the definer
-- function can safely use an empty search_path.
CREATE OR REPLACE FUNCTION public.process_recurring_expenses(
  p_user_id     UUID DEFAULT NULL::UUID,
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(generated_count INTEGER, processed_recurring_ids UUID[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

  IF p_user_id IS NOT NULL AND p_user_id <> v_caller_id THEN
    RAISE EXCEPTION 'Cannot process recurring expenses for another user';
  END IF;

  IF p_target_date > CURRENT_DATE + INTERVAL '1 year' THEN
    RAISE EXCEPTION 'target_date cannot be more than 1 year in the future';
  END IF;

  FOR v_recurring IN
    SELECT re.*
    FROM public.recurring_expenses re
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
      v_next_date := public.calculate_next_occurrence(
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
      INSERT INTO public.expenses (
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

      UPDATE public.recurring_expenses
      SET last_generated_date = v_next_date
      WHERE id = v_recurring.id;

      v_iteration_count := v_iteration_count + 1;

      v_next_date := public.calculate_next_occurrence(
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

REVOKE EXECUTE ON FUNCTION public.process_recurring_expenses(UUID, DATE)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_recurring_expenses(UUID, DATE)
  TO authenticated, service_role;

-- Rollback:
-- ALTER FUNCTION public.tags(public.expenses) RESET search_path;
-- Restore process_recurring_expenses from
-- 20260822000000_fix_recurring_anchor_and_exclusions.sql.
