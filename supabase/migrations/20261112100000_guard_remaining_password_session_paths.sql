-- 20260925100000 refused password sessions at every finance boundary, but
-- three paths still only compared auth.uid():
--
-- 1. process_recurring_expenses is SECURITY DEFINER, so it never met the
--    policies that carry the guard. A password session could generate up to a
--    year of future-dated expenses in the account it was registered against.
--    Current bundles do not call it (the cron uses
--    process_all_recurring_expenses), but months-old installed PWAs may, so
--    the grant stays and the body gains the guard.
-- 2. user_ui_preferences, feedback_reports and product_events hold no money
--    data, yet a session the app never issued has no business writing to them.
-- 3. The receipts bucket was created in the dashboard, so its private flag,
--    size limit and MIME allowlist lived nowhere in this repository.

-- Body unchanged from 20260904170059_harden_advisor_functions.sql apart from
-- the passwordless check beside the auth.uid() one.
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
  IF v_caller_id IS NULL OR NOT private.is_passwordless_session() THEN
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

ALTER POLICY "Users can view their own UI preferences"
  ON public.user_ui_preferences
  USING (
    (SELECT private.is_passwordless_session())
    AND (SELECT auth.uid()) = user_id
  );

ALTER POLICY "Users can insert their own UI preferences"
  ON public.user_ui_preferences
  WITH CHECK (
    (SELECT private.is_passwordless_session())
    AND (SELECT auth.uid()) = user_id
  );

ALTER POLICY "Users can update their own UI preferences"
  ON public.user_ui_preferences
  USING (
    (SELECT private.is_passwordless_session())
    AND (SELECT auth.uid()) = user_id
  )
  WITH CHECK (
    (SELECT private.is_passwordless_session())
    AND (SELECT auth.uid()) = user_id
  );

ALTER POLICY "Users can submit their own feedback"
  ON public.feedback_reports
  WITH CHECK (
    (SELECT private.is_passwordless_session())
    AND (SELECT auth.uid()) = user_id
  );

ALTER POLICY "Users can submit their own product events"
  ON public.product_events
  WITH CHECK (
    (SELECT private.is_passwordless_session())
    AND (SELECT auth.uid()) = user_id
  );

-- The app has only ever uploaded WebP (receiptService compresses to it before
-- upload). JPEG and PNG stay allowed so a direct image upload is not refused
-- for its format alone; everything that is not an image is. 10 MiB is the
-- per-object limit private.receipt_quota_available already assumes.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'receipts',
  'receipts',
  false,
  10485760,
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Rollback:
-- Restore process_recurring_expenses from
-- 20260904170059_harden_advisor_functions.sql, re-run the five policies from
-- 20260826160000_add_ui_preferences_and_feedback.sql and
-- 20260913165741_add_product_events.sql, and set the bucket's previous
-- limits in the dashboard.
