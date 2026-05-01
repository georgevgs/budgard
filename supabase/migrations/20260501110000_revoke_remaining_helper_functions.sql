-- Lock down the remaining advisor-flagged SECURITY DEFINER functions
-- (lints 0028 / 0029). All three are safe to revoke from anon/authenticated
-- because none are reached via the PostgREST API:
--
-- update_updated_at_column()
--   Trigger-only. Triggers fire regardless of the calling role's EXECUTE
--   grant on the trigger function, so revoking does not break inserts/updates.
--
-- calculate_next_occurrence(text, date, date)
--   Internal date-math helper. Only called from inside SECURITY DEFINER
--   processor functions, which execute as the function owner (postgres).
--   The owner retains EXECUTE, so internal calls keep working.
--
-- get_upcoming_recurring_expenses(uuid, integer)
--   Defined but not currently wired up by any client/edge code. If a future
--   feature exposes it, re-grant to authenticated then.

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_next_occurrence(TEXT, DATE, DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_next_occurrence(TEXT, DATE, DATE) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_next_occurrence(TEXT, DATE, DATE) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_upcoming_recurring_expenses(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_upcoming_recurring_expenses(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_upcoming_recurring_expenses(UUID, INTEGER) FROM authenticated;
