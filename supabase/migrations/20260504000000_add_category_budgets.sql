-- Per-category monthly budget caps. One row per (user, expense category).
-- The global cap on user_budgets.monthly_amount stays the source of truth for
-- the overall monthly limit; this table layers on optional sub-limits for
-- specific categories. Spending is derived client-side from existing expenses
-- (no precomputed aggregate stored here).
CREATE TABLE category_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  monthly_amount NUMERIC NOT NULL CHECK (monthly_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id)
);

ALTER TABLE category_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own category budgets"
  ON category_budgets FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own category budgets"
  ON category_budgets FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own category budgets"
  ON category_budgets FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own category budgets"
  ON category_budgets FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE INDEX category_budgets_user_id_idx ON category_budgets(user_id);
CREATE INDEX category_budgets_category_id_idx ON category_budgets(category_id);

CREATE TRIGGER category_budgets_set_updated_at
  BEFORE UPDATE ON category_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
