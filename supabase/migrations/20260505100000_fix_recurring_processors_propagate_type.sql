-- Recurring income (recurring_expenses.type = 'income') was being generated
-- as type='expense' rows because the three recurring-processor functions
-- (process_all_recurring_expenses cron, process_recurring_expenses user RPC,
-- and generate_recurring_expenses trigger) omit `type` from their INSERT into
-- expenses. The expenses.type column defaults to 'expense', so income
-- transactions silently became expenses — they did not show up in /income or
-- /cash-flow, and they polluted the monthly budget.
--
-- Fix: copy re.type onto the inserted row in all three functions, then
-- backfill any existing rows where expenses.type ≠ recurring_expenses.type.

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
          recurring_expense_id,
          type
        ) VALUES (
          v_recurring.user_id,
          v_recurring.amount,
          v_recurring.description,
          v_next_date,
          v_recurring.category_id,
          v_recurring.id,
          v_recurring.type
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


CREATE OR REPLACE FUNCTION public.process_recurring_expenses(
  p_user_id UUID DEFAULT NULL::UUID,
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(generated_count INTEGER, processed_recurring_ids UUID[])
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
  v_iteration_limit INT := 52;
  v_iteration_count INT;
  v_existing_count INT;
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
          recurring_expense_id,
          type
        ) VALUES (
          v_recurring.user_id,
          v_recurring.amount,
          v_recurring.description,
          v_next_date,
          v_recurring.category_id,
          v_recurring.id,
          v_recurring.type
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


CREATE OR REPLACE FUNCTION public.generate_recurring_expenses()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    rec RECORD;
    next_date DATE;
    last_date DATE;
    interval_val INTERVAL;
BEGIN
    FOR rec IN
        SELECT * FROM public.recurring_expenses
        WHERE active = true
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    LOOP
        CASE rec.frequency
            WHEN 'weekly' THEN interval_val := '1 week'::interval;
            WHEN 'biweekly' THEN interval_val := '2 weeks'::interval;
            WHEN 'monthly' THEN interval_val := '1 month'::interval;
            WHEN 'quarterly' THEN interval_val := '3 months'::interval;
            WHEN 'yearly' THEN interval_val := '1 year'::interval;
        END CASE;

        IF rec.last_generated_date IS NOT NULL THEN
            next_date := rec.last_generated_date + interval_val;
        ELSE
            next_date := rec.start_date;
        END IF;

        last_date := NULL;

        WHILE next_date <= CURRENT_DATE LOOP
            INSERT INTO public.expenses (
                amount,
                description,
                category_id,
                date,
                user_id,
                recurring_expense_id,
                type
            ) VALUES (
                rec.amount,
                rec.description,
                rec.category_id,
                next_date,
                rec.user_id,
                rec.id,
                rec.type
            )
            ON CONFLICT ON CONSTRAINT expenses_recurring_date_unique DO NOTHING;

            last_date := next_date;
            next_date := next_date + interval_val;
        END LOOP;

        IF last_date IS NOT NULL THEN
            UPDATE public.recurring_expenses
            SET last_generated_date = last_date
            WHERE id = rec.id;
        END IF;
    END LOOP;
END;
$function$;


-- Backfill: any existing expenses row whose type doesn't match its recurring
-- parent (i.e. recurring income that was generated as expense) gets corrected.
UPDATE public.expenses e
SET type = re.type
FROM public.recurring_expenses re
WHERE e.recurring_expense_id = re.id
  AND e.type IS DISTINCT FROM re.type;
