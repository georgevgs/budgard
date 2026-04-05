-- Revoke PUBLIC execute on generate_recurring_expenses.
-- PostgreSQL grants EXECUTE to PUBLIC by default for functions created in public schema.
-- The previous migration only revoked from anon/authenticated roles, but they inherit
-- the privilege from PUBLIC. This revokes from PUBLIC, which covers everyone.
-- The function is called only by the check_recurring_expenses trigger (internal).
REVOKE EXECUTE ON FUNCTION public.generate_recurring_expenses() FROM PUBLIC;
