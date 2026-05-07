-- expenses_tag_id_fkey was unindexed — flagged by the Supabase perf advisor.
-- Tag filtering in the expenses list (useExpensesFilter.selectedTagId) and
-- cascading deletes from tags both rely on this lookup. Most expenses won't
-- carry a tag, so a partial index keeps it small.
CREATE INDEX IF NOT EXISTS idx_expenses_tag_id
  ON public.expenses(tag_id)
  WHERE tag_id IS NOT NULL;
