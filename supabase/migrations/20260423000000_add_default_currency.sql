-- Add default_currency column to user_budgets table.
-- Defaults to EUR for backward compatibility with existing users.
ALTER TABLE user_budgets
ADD COLUMN IF NOT EXISTS default_currency TEXT NOT NULL DEFAULT 'EUR';
