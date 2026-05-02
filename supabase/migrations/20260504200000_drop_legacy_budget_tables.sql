-- Drop legacy budget tables superseded by user_budgets.
--
-- public.budgets         -- 2 rows, last updated 2025-08-26 (last touched ~9 months ago)
-- public.monthly_budgets -- 14 rows, last updated 2025-10-04 (last touched ~7 months ago)
--
-- Verified before drop:
--   - Zero references in src/ or supabase/functions/
--   - Zero inbound foreign keys from any other public.* table
--   - Zero triggers, functions, or views referencing them
--   - Both have only their own user_id → auth.users FK (CASCADE) + 4 RLS policies
-- The current source of truth for monthly budget caps is public.user_budgets.

BEGIN;

DROP TABLE IF EXISTS public.budgets;
DROP TABLE IF EXISTS public.monthly_budgets;

COMMIT;
