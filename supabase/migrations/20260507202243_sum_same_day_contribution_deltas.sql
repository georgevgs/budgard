-- Same-day contribution_delta upsert was REPLACING rather than ACCUMULATING.
-- Two same-day "Add money" calls with +100 then +50 silently wiped the first
-- +100, breaking XIRR cashflows and YTD growth. SUM on conflict instead so
-- "today's net contribution" matches what user-visible totals (Revolut,
-- Monzo, YNAB) imply. NULL+NULL stays NULL so an "Update value" call doesn't
-- zero an existing contribution.
--
-- Also folds in note preservation: note = COALESCE(EXCLUDED.note, ab.note)
-- keeps a same-day note when a later "Update value" snapshot sends note=null.

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
