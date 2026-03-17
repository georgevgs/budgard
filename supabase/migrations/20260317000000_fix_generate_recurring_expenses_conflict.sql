CREATE OR REPLACE FUNCTION public.generate_recurring_expenses()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    rec RECORD;
    next_date DATE;
    interval_str TEXT;
BEGIN
    FOR rec IN
        SELECT * FROM public.recurring_expenses
        WHERE active = true
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    LOOP
        next_date := COALESCE(rec.last_generated_date, rec.start_date);

        CASE rec.frequency
            WHEN 'weekly' THEN interval_str := '1 week';
            WHEN 'monthly' THEN interval_str := '1 month';
            WHEN 'quarterly' THEN interval_str := '3 months';
            WHEN 'yearly' THEN interval_str := '1 year';
        END CASE;

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
            next_date := next_date + interval_str::interval;
        END LOOP;

        UPDATE public.recurring_expenses
        SET last_generated_date = CURRENT_DATE
        WHERE id = rec.id;
    END LOOP;
END;
$function$;
