-- Goals: trackable savings/budget targets. Progress is computed from existing
-- transactions (no money movement) — a goal is a "target + source" record.
-- source_type determines how progress is derived:
--   'category'  → sum of expenses in category_id since start_date
--   'tag'       → sum of expenses tagged with tag_id since start_date
--   'net_delta' → (income - expenses) since start_date
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  deadline DATE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_type TEXT NOT NULL CHECK (source_type IN ('category', 'tag', 'net_delta')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE SET NULL,
  icon TEXT NOT NULL DEFAULT 'target',
  color TEXT NOT NULL DEFAULT '#f97316',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals"
  ON goals FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own goals"
  ON goals FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own goals"
  ON goals FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE INDEX goals_user_id_idx ON goals(user_id);
CREATE INDEX goals_category_id_idx ON goals(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX goals_tag_id_idx ON goals(tag_id) WHERE tag_id IS NOT NULL;

-- Auto-bump updated_at on every UPDATE (function already exists in this project).
CREATE TRIGGER goals_set_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
