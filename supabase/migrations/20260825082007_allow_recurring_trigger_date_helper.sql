-- check_recurring_expenses() is a SECURITY INVOKER trigger, so any helper it
-- calls must be executable by the role that edits the recurring expense. The
-- anchored-date migration started calling calculate_next_occurrence() here
-- while leaving that pure date helper restricted to service_role, which made
-- schedule edits fail with SQLSTATE 42501.
--
-- The helper reads no tables and performs only date arithmetic. Keep it
-- SECURITY INVOKER and expose it only to the two roles that run recurring
-- processing: authenticated for edit-time triggers and service_role for cron.

ALTER FUNCTION public.calculate_next_occurrence(TEXT, DATE, DATE)
  SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.calculate_next_occurrence(TEXT, DATE, DATE)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.calculate_next_occurrence(TEXT, DATE, DATE)
  TO authenticated, service_role;
