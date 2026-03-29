-- Drop the trigger and function that auto-created English-only default categories
-- Categories are now created client-side during onboarding, respecting the user's language
DROP TRIGGER IF EXISTS create_default_categories_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.create_default_categories_for_user();
