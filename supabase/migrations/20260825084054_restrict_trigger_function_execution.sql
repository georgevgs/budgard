-- These SECURITY DEFINER functions are trigger entry points, not application
-- RPCs. PostgreSQL triggers run them through the trigger owner and do not need
-- client roles to have EXECUTE. Earlier migrations revoked only PUBLIC, while
-- explicit default grants to API roles remained in place.
--
-- Remove every API role's direct invocation path. The function owner keeps
-- EXECUTE, so the existing triggers continue to enforce plan limits.

REVOKE EXECUTE ON FUNCTION public.enforce_free_account_cap()
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.enforce_free_category_cap()
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.enforce_free_recurring_expense_cap()
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.enforce_pro_only_insert()
  FROM PUBLIC, anon, authenticated, service_role;
