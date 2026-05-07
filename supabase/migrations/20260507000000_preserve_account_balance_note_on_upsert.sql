-- The original atomic upsert (20260505200000) preserves contribution_delta
-- with COALESCE so an "Update value" snapshot doesn't erase a contribution
-- already logged for the same day. note had no such guard: BalanceSnapshotForm
-- sends note: null whenever the user doesn't fill the field, so a same-day
-- value-update silently wiped any note set by an earlier snapshot.
-- Apply the same COALESCE guard to note.

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
    contribution_delta = COALESCE(EXCLUDED.contribution_delta, ab.contribution_delta),
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
