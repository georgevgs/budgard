-- Add indexes on unindexed foreign keys flagged by Supabase performance advisor.
-- These improve JOIN and CASCADE DELETE performance.

CREATE INDEX IF NOT EXISTS idx_expense_templates_category_id ON expense_templates (category_id);
CREATE INDEX IF NOT EXISTS idx_expense_templates_tag_id ON expense_templates (tag_id);
CREATE INDEX IF NOT EXISTS idx_expense_templates_user_id ON expense_templates (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses (category_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_category_id ON recurring_expenses (category_id);
