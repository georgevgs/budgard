-- Multiple tags per expense (Pro). expenses.tag_id stays the primary tag —
-- the free tier's single tag and the shape every existing client, cache
-- snapshot and offline queue entry already understands. Additional tags live
-- here, one row per (expense, tag), and only Pro can create them (the free
-- tier's one-tag limit is exactly "no rows in this table").

CREATE TABLE expense_tags (
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (expense_id, tag_id)
);

ALTER TABLE expense_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own expense tags"
  ON expense_tags FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- WITH CHECK also verifies the referenced expense and tag belong to the
-- caller — the FKs alone would let a user attach rows to someone else's ids
-- (same tightening as account_balances in 20260515181828).
CREATE POLICY "Users can insert their own expense tags"
  ON expense_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM expenses e
      WHERE e.id = expense_id AND e.user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM tags tg
      WHERE tg.id = tag_id AND tg.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete their own expense tags"
  ON expense_tags FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE INDEX expense_tags_tag_id_idx ON expense_tags(tag_id);
CREATE INDEX expense_tags_user_id_idx ON expense_tags(user_id);

-- Additional tags are a Pro feature; reuse the Pro-only insert guard from
-- 20260727000000.
CREATE TRIGGER expense_tags_pro_only
  BEFORE INSERT ON public.expense_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pro_only_insert();
