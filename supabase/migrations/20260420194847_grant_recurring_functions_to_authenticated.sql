-- The trigger on recurring_expenses (check_recurring_expenses → generate_recurring_expenses)
-- runs as the calling role (SECURITY INVOKER). The authenticated role was missing EXECUTE
-- permission on both functions, causing a 403 on every INSERT/UPDATE to recurring_expenses.
GRANT EXECUTE ON FUNCTION public.check_recurring_expenses() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_recurring_expenses() TO authenticated;
