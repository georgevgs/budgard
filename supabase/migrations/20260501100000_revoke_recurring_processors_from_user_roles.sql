-- Lock down the recurring-expense processor functions to their intended
-- callers, addressing advisor lints 0028/0029.
--
-- process_all_recurring_expenses(date)
--   Cron-only. The 2026-05-01 migration revoked EXECUTE from PUBLIC and
--   granted it to service_role, but anon/authenticated still appear in the
--   ACL (legacy explicit grants). Revoke them explicitly so the only
--   callers are service_role and postgres (which is how cron runs it).
--
-- process_recurring_expenses(uuid, date)
--   The user-callable variant. Currently unused by the app (the cron now
--   uses the all-variant, and no client/edge code calls this directly).
--   Revoke from PUBLIC, anon, and authenticated. If a future feature needs
--   on-demand per-user generation, re-grant to authenticated at that time.

REVOKE EXECUTE ON FUNCTION public.process_all_recurring_expenses(DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_all_recurring_expenses(DATE) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_all_recurring_expenses(DATE) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.process_recurring_expenses(UUID, DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_recurring_expenses(UUID, DATE) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_recurring_expenses(UUID, DATE) FROM authenticated;
