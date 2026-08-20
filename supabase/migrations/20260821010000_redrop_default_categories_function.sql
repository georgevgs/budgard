-- Undo 20260821000000, which should never have existed.
--
-- 20260329000000 dropped both create_default_categories_trigger and
-- create_default_categories_for_user() because the seeded names were
-- English-only; onboarding now creates categories client-side in the user's
-- language. The function had therefore been absent from production since
-- 2026-03-29.
--
-- 20260821000000 set out to pin search_path on it and used CREATE OR REPLACE,
-- which re-created the function instead of amending one. Nothing calls it —
-- auth.users carries only internal RI triggers, and a RETURNS trigger function
-- is not reachable over PostgREST — so the blast radius was an orphan in the
-- catalog. It still has to go: it is dead code in production, and it carries
-- the exact English-only seeding logic that was removed on purpose.
--
-- Idempotent, and safe on any database that already lacks the function.

DROP FUNCTION IF EXISTS public.create_default_categories_for_user();
