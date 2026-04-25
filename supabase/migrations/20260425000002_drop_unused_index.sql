-- Drop unused index flagged by Supabase performance advisor.
-- idx_expenses_tag_id has never been used since creation.

DROP INDEX IF EXISTS idx_expenses_tag_id;
