-- Lock down the sync_account_from_balances SECURITY DEFINER function
-- (lints 0028 / 0029). It's trigger-only — triggers fire regardless of
-- the calling role's EXECUTE grant, so revoking does not break the
-- account_balances insert/update/delete path.
REVOKE EXECUTE ON FUNCTION public.sync_account_from_balances() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_account_from_balances() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_account_from_balances() FROM authenticated;
