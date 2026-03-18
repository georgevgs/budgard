-- Delete expenses that were auto-generated on 2026-03-17 by the buggy function.
-- The old function re-ran from last_generated_date instead of last_generated_date + interval,
-- creating duplicate expenses (possibly with mixed dates).
--
-- Strategy: delete all recurring-linked expenses created on March 17 where
-- an older expense for the same recurring rule already existed.
-- This removes the re-run duplicates while keeping the originals.
DELETE FROM public.expenses
WHERE id IN (
    SELECT e.id
    FROM public.expenses e
    WHERE e.recurring_expense_id IS NOT NULL
    AND e.created_at >= '2026-03-17 00:00:00+00'
    AND e.created_at < '2026-03-18 00:00:00+00'
    AND EXISTS (
        SELECT 1 FROM public.expenses older
        WHERE older.recurring_expense_id = e.recurring_expense_id
        AND older.id != e.id
        AND older.created_at < '2026-03-17 00:00:00+00'
    )
);

-- Also reset last_generated_date for all recurring expenses back to the most recent
-- legitimately generated expense date (before the buggy run on March 17),
-- so the fixed function picks up from the correct point.
UPDATE public.recurring_expenses re
SET last_generated_date = (
    SELECT MAX(e.date)
    FROM public.expenses e
    WHERE e.recurring_expense_id = re.id
)
WHERE re.active = true;
