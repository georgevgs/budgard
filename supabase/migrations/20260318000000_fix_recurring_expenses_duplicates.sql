-- 1. Delete duplicate expenses created by the buggy function
-- Keeps the earliest record (smallest id) for each (recurring_expense_id, date) pair
DELETE FROM public.expenses
WHERE id IN (
  SELECT e1.id
  FROM public.expenses e1
  INNER JOIN public.expenses e2
    ON e1.recurring_expense_id = e2.recurring_expense_id
    AND e1.date = e2.date
    AND e1.id > e2.id
  WHERE e1.recurring_expense_id IS NOT NULL
);

-- 2. Ensure the unique constraint exists (may already exist if created manually)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'expenses_recurring_date_unique'
    ) THEN
        ALTER TABLE public.expenses
            ADD CONSTRAINT expenses_recurring_date_unique
            UNIQUE (recurring_expense_id, date);
    END IF;
END $$;

-- 3. Fix the function: start from last_generated_date + interval, not last_generated_date
CREATE OR REPLACE FUNCTION public.generate_recurring_expenses()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    rec RECORD;
    next_date DATE;
    interval_val INTERVAL;
BEGIN
    FOR rec IN
        SELECT * FROM public.recurring_expenses
        WHERE active = true
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    LOOP
        CASE rec.frequency
            WHEN 'weekly' THEN interval_val := '1 week'::interval;
            WHEN 'monthly' THEN interval_val := '1 month'::interval;
            WHEN 'quarterly' THEN interval_val := '3 months'::interval;
            WHEN 'yearly' THEN interval_val := '1 year'::interval;
        END CASE;

        IF rec.last_generated_date IS NOT NULL THEN
            next_date := rec.last_generated_date + interval_val;
        ELSE
            next_date := rec.start_date;
        END IF;

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
            next_date := next_date + interval_val;
        END LOOP;

        UPDATE public.recurring_expenses
        SET last_generated_date = CURRENT_DATE
        WHERE id = rec.id;
    END LOOP;
END;
$function$;
