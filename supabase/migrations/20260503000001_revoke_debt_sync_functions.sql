-- Lock down the SECURITY DEFINER functions added in 20260503000000_add_debts
-- (lints 0028 / 0029). Both are trigger-internal — triggers fire regardless of
-- EXECUTE grant on the function, so revoking does not break payment writes.
REVOKE EXECUTE ON FUNCTION public.recompute_debt_balance(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recompute_debt_balance(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recompute_debt_balance(UUID) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.sync_debt_from_expenses() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_debt_from_expenses() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_debt_from_expenses() FROM authenticated;
