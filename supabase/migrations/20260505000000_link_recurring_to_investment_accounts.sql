-- Link a recurring expense to an investment account so that each generated
-- expense automatically logs a contribution snapshot. Targets the Trade
-- Republic / savings-plan use case: a user already records the monthly
-- Sparplan as a recurring expense; this lets the same row drive cost-basis
-- tracking on the investment account without duplicate manual entry.
--
-- The trigger fires on every expense INSERT regardless of which function
-- created it (the daily cron, the user-callable processor, manual entry).

ALTER TABLE recurring_expenses
  ADD COLUMN linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX recurring_expenses_linked_account_idx
  ON recurring_expenses(linked_account_id)
  WHERE linked_account_id IS NOT NULL;


CREATE OR REPLACE FUNCTION public.sync_linked_investment_contribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linked_account_id UUID;
  v_account_kind TEXT;
  v_existing_balance NUMERIC;
  v_recurring_description TEXT;
BEGIN
  IF NEW.recurring_expense_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT linked_account_id, description
  INTO v_linked_account_id, v_recurring_description
  FROM recurring_expenses
  WHERE id = NEW.recurring_expense_id;

  IF v_linked_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT kind, current_balance
  INTO v_account_kind, v_existing_balance
  FROM accounts
  WHERE id = v_linked_account_id;

  -- Auto-tracking is investment-only. The linked column is permissive at the
  -- schema level so we silently skip non-investment accounts here.
  IF v_account_kind IS DISTINCT FROM 'investment' THEN
    RETURN NEW;
  END IF;

  INSERT INTO account_balances (
    account_id,
    user_id,
    balance,
    contribution_delta,
    recorded_at,
    note
  ) VALUES (
    v_linked_account_id,
    NEW.user_id,
    COALESCE(v_existing_balance, 0) + NEW.amount,
    NEW.amount,
    NEW.date,
    'Auto: ' || v_recurring_description
  )
  ON CONFLICT (account_id, recorded_at) DO UPDATE
  SET
    balance = account_balances.balance + EXCLUDED.contribution_delta,
    contribution_delta =
      COALESCE(account_balances.contribution_delta, 0)
      + EXCLUDED.contribution_delta;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_linked_investment_contribution() FROM PUBLIC;

CREATE TRIGGER expenses_sync_linked_investment
  AFTER INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_linked_investment_contribution();
