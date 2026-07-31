-- Stale PWA bundles (pre-2026-07-27, before expense_tags) embed the primary
-- tag as a bare `tag:tags(*)`. expense_tags gave expenses a second
-- relationship to tags, so PostgREST now rejects that bare embed as ambiguous
-- (PGRST201, HTTP 300) — every not-yet-updated install fails all expense and
-- income reads AND writes on boot, and users returning after months see a
-- dead app until their service worker manages to update (Sentry issue on
-- /expenses, first seen 2026-07-30).
--
-- This computed relationship overrides the two auto-detected candidates for
-- the bare `tags` embed name and restores its old meaning: the row's primary
-- tag via tag_id. Current bundles are unaffected — they embed through
-- `tags!expenses_tag_id_fkey` and `expense_tags` explicitly, which never
-- consult the bare name.
--
-- SECURITY INVOKER (default) plus a plain SQL body keeps tags RLS in force —
-- the embed can only ever surface the caller's own tags, same as the FK join
-- it replaces. The single-SELECT body carries no SET clause and is fully
-- schema-qualified, so Postgres inlines it into the outer query and the plan
-- stays the same primary-key lookup the old FK embed produced.
--
-- Rollback: DROP FUNCTION public.tags(public.expenses);
-- (bare-name embeds then go back to PGRST201; nothing else depends on it).
CREATE OR REPLACE FUNCTION public.tags(public.expenses)
RETURNS SETOF public.tags
LANGUAGE sql
STABLE
ROWS 1
AS $$
  SELECT * FROM public.tags WHERE id = $1.tag_id
$$;
