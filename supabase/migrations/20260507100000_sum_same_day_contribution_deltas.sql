-- Same-day contribution_delta upsert was REPLACING rather than ACCUMULATING.
-- Scenario: user clicks "Add money" with +100 in the morning, then "Add money"
-- again with +50 in the afternoon. Both upserts target (account_id, today),
-- and the previous COALESCE rule ("EXCLUDED wins when non-null") meant the
-- second call silently wiped the first +100. The balance came out right (the
-- form computes balance = previous balance + delta before sending), but the
-- contribution history fed into XIRR cashflows and YTD growth was off by 100.
--
-- Industry convention (Revolut Vaults, Monzo Pots, Plaid /investments/transactions,
-- YNAB) is to keep each contribution as its own event row and aggregate on read.
-- That would be a fuller refactor (drop the (account_id, recorded_at) unique
-- constraint, switch the read paths to sum events per day). For now we get the
-- same user-facing total — "today's net contribution" — by SUMMING deltas on
-- conflict instead of replacing. Trade-off: we still lose the per-event FX
-- metadata (original_amount/currency/exchange_rate) for older contributions on
-- the same day; the latest event's metadata wins. Acceptable for a manual
-- personal-finance app; revisit if we ever surface a per-event audit log.
--
-- COALESCE(_, 0) on both sides so a null + null upsert doesn't crash and so an
-- "Update value" call (delta NULL) preserves any existing same-day contribution
-- rather than zeroing it out.

CREATE OR REPLACE FUNCTION public.upsert_account_balance(
  p_account_id UUID,
  p_balance NUMERIC,
  p_contribution_delta NUMERIC DEFAULT NULL,
  p_recorded_at DATE DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_original_amount NUMERIC DEFAULT NULL,
  p_original_currency TEXT DEFAULT NULL,
  p_exchange_rate NUMERIC DEFAULT NULL
)
RETURNS account_balances
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row account_balances;
BEGIN
  INSERT INTO account_balances AS ab (
    account_id,
    balance,
    contribution_delta,
    recorded_at,
    note,
    original_amount,
    original_currency,
    exchange_rate
  )
  VALUES (
    p_account_id,
    p_balance,
    p_contribution_delta,
    COALESCE(p_recorded_at, CURRENT_DATE),
    p_note,
    p_original_amount,
    p_original_currency,
    p_exchange_rate
  )
  ON CONFLICT (account_id, recorded_at) DO UPDATE SET
    balance = EXCLUDED.balance,
    contribution_delta = CASE
      WHEN ab.contribution_delta IS NULL AND EXCLUDED.contribution_delta IS NULL
        THEN NULL
      ELSE COALESCE(ab.contribution_delta, 0) + COALESCE(EXCLUDED.contribution_delta, 0)
    END,
    note = COALESCE(EXCLUDED.note, ab.note),
    original_amount = EXCLUDED.original_amount,
    original_currency = EXCLUDED.original_currency,
    exchange_rate = EXCLUDED.exchange_rate
  RETURNING ab.* INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_account_balance(
  UUID, NUMERIC, NUMERIC, DATE, TEXT, NUMERIC, TEXT, NUMERIC
) TO authenticated;
