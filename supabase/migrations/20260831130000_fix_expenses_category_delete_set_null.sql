-- expenses.category_id was the one category_id foreign key left without an
-- ON DELETE rule (recurring_expenses, expense_templates and goals already
-- SET NULL; category_budgets already CASCADEs). Deleting a category that is
-- still used by an expense hits the default RESTRICT behaviour and PostgREST
-- returns 409 Conflict — visible in production (Sentry BUDGARD-J).
--
-- The client already assumes SET NULL: useCategoryOps' optimistic delete
-- strips category_id off the affected expenses locally, and the delete
-- confirmation copy tells the user up front that "Expenses in this category
-- will become uncategorized." This migration makes the database actually do
-- that instead of rejecting the delete.

BEGIN;

ALTER TABLE public.expenses
  DROP CONSTRAINT expenses_category_id_fkey,
  ADD CONSTRAINT expenses_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

COMMIT;
