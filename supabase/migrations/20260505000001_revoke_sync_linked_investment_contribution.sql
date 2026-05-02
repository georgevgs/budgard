-- The trigger function `sync_linked_investment_contribution` is invoked only
-- by the `expenses_sync_linked_investment` AFTER INSERT trigger. The Supabase
-- linter (advisors 0028 and 0029) flags any SECURITY DEFINER function that
-- anon/authenticated can call directly via PostgREST. We mirror the pattern
-- from `revoke_sync_account_from_balances`: revoke EXECUTE explicitly from
-- the role hierarchy so the function is reachable only by the trigger.

REVOKE EXECUTE ON FUNCTION public.sync_linked_investment_contribution() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_linked_investment_contribution() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_linked_investment_contribution() FROM authenticated;
