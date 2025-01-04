-- Seed script for default categories
-- This script assumes you have a categories table with columns:
-- id (auto-generated),
-- name (text),
-- user_id (uuid),
-- created_at (timestamp)

-- Function to insert default categories for a new user
CREATE OR REPLACE FUNCTION insert_default_categories(new_user_id UUID)
RETURNS VOID AS $$
DECLARE
default_categories TEXT[] := ARRAY[
        'Food',
        'Transportation',
        'Housing',
        'Utilities',
        'Insurance',
        'Healthcare',
        'Savings',
        'Entertainment',
        'Shopping',
        'Miscellaneous'
    ];
    category_name TEXT;
BEGIN
    FOREACH category_name IN ARRAY default_categories
    LOOP
        INSERT INTO categories (
            name,
            user_id,
            created_at
        ) VALUES (
            category_name,
            new_user_id,
            NOW()
        );
END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Trigger to automatically add default categories when a new user is created
-- Assumes you have a auth.users table and a public.users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Call the function to insert default categories
    PERFORM insert_default_categories(NEW.id);
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger (uncomment and adjust as needed)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Manual usage example:
-- SELECT insert_default_categories('user-uuid-here');