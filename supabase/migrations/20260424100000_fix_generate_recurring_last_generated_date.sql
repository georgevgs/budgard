-- Fix generate_recurring_expenses(): the function was unconditionally setting
-- last_generated_date = CURRENT_DATE for ALL active expenses on every trigger
-- invocation, even when no expenses were generated. This corrupted the next
-- occurrence calculation for every recurring expense whenever any single one
-- was inserted or updated.
--
-- Changes:
-- 1. Only update last_generated_date when expenses were actually generated
-- 2. Set it to the actual last generated date, not CURRENT_DATE
-- 3. Add missing biweekly frequency support

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
                recurring_expense_id
            ) VALUES (
                rec.amount,
                rec.description,
                rec.category_id,
                next_date,
                rec.user_id,
                rec.id
            )
            ON CONFLICT ON CONSTRAINT expenses_recurring_date_unique DO NOTHING;

            last_date := next_date;
            next_date := next_date + interval_val;
        END LOOP;

        -- Only update last_generated_date if we actually generated expenses
        IF last_date IS NOT NULL THEN
            UPDATE public.recurring_expenses
            SET last_generated_date = last_date
            WHERE id = rec.id;
        END IF;
    END LOOP;
END;
$function$;

-- Fix corrupted data: reset last_generated_date to the actual last expense
-- date for each recurring expense. For expenses with no generated records,
-- reset to NULL so the next run picks up from start_date.
UPDATE recurring_expenses re
SET last_generated_date = sub.actual_last
FROM (
    SELECT
        re2.id,
        (SELECT MAX(e.date) FROM expenses e WHERE e.recurring_expense_id = re2.id) AS actual_last
    FROM recurring_expenses re2
) sub
WHERE re.id = sub.id
  AND re.last_generated_date IS DISTINCT FROM sub.actual_last;
