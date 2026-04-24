-- Expense templates: save frequently-used expense configurations for one-tap reuse
CREATE TABLE expense_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE SET NULL,
  original_currency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE expense_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as tags/categories)
CREATE POLICY "Users can view their own templates"
  ON expense_templates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates"
  ON expense_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON expense_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
