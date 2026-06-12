-- Security hardening (June 2026 audit)
--
-- 1. check_recurring_expenses(): previous version looped without an iteration
--    cap from start_date to CURRENT_DATE across ALL of the caller's active
--    recurring expenses. A direct REST insert with a very old start_date
--    (bypassing client validation) could synchronously generate ~100k expense
--    rows inside the trigger transaction. New version is scoped to the row
--    that fired the trigger and capped at 52 occurrences per statement; the
--    daily cron (process_all_recurring_expenses) picks up any remainder,
--    mirroring the cap in process_recurring_expenses.
-- 2. generate_recurring_expenses(): superseded by the rewritten trigger
--    function; dropped.
-- 3. start_date sanity floor so the API can't request decades of backfill.
-- 4. Least-privilege EXECUTE grants: trigger execution does not require
--    EXECUTE for the firing role, and upsert_account_balance is only ever
--    called by authenticated users.

CREATE OR REPLACE FUNCTION public.check_recurring_expenses()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    interval_val INTERVAL;
    next_date DATE;
    last_date DATE;
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

    -- Same skip semantics as process_recurring_expenses: inactive rows and
    -- schedules whose end_date already passed generate nothing.
    IF NEW.active IS DISTINCT FROM true
       OR (NEW.end_date IS NOT NULL AND NEW.end_date < CURRENT_DATE) THEN
        RETURN NEW;
    END IF;

    CASE NEW.frequency
        WHEN 'weekly'    THEN interval_val := interval '1 week';
        WHEN 'biweekly'  THEN interval_val := interval '2 weeks';
        WHEN 'monthly'   THEN interval_val := interval '1 month';
        WHEN 'quarterly' THEN interval_val := interval '3 months';
        WHEN 'yearly'    THEN interval_val := interval '1 year';
    END CASE;

    IF NEW.last_generated_date IS NOT NULL THEN
        next_date := NEW.last_generated_date + interval_val;
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

        last_date := next_date;
        iterations := iterations + 1;
        next_date := next_date + interval_val;
    END LOOP;

    IF last_date IS NOT NULL THEN
        UPDATE public.recurring_expenses
        SET last_generated_date = last_date
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$function$;

DROP FUNCTION IF EXISTS public.generate_recurring_expenses();

ALTER TABLE public.recurring_expenses
    ADD CONSTRAINT recurring_expenses_start_date_sane
    CHECK (start_date >= DATE '2000-01-01');

REVOKE EXECUTE ON FUNCTION public.check_recurring_expenses() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_account_balance(uuid, numeric, numeric, date, text, numeric, text, numeric) FROM PUBLIC, anon;
