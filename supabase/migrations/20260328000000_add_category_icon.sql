-- Add optional icon (emoji) field to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon text;
