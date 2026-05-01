-- Accounts: balance-based records (cash, bank, credit_card, loan, investment, other).
-- Drives the net-worth view. Liabilities are derived from kind in app code, not stored.
-- current_balance and cost_basis are denormalized caches kept in sync by triggers
-- on account_balances so the net-worth list query stays a single SELECT.
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('cash','bank','credit_card','loan','investment','other')),
  default_currency TEXT NOT NULL DEFAULT 'EUR',
  current_balance NUMERIC NOT NULL DEFAULT 0,
  cost_basis NUMERIC NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT 'wallet',
  color TEXT NOT NULL DEFAULT '#f97316',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own accounts"
  ON accounts FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own accounts"
  ON accounts FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own accounts"
  ON accounts FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE INDEX accounts_user_id_idx ON accounts(user_id);
CREATE INDEX accounts_user_active_idx ON accounts(user_id, is_archived) WHERE is_archived = false;

CREATE TRIGGER accounts_set_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- Snapshots: one row per user-recorded balance update.
-- balance is in account.default_currency. Foreign-currency entries store
-- original_amount/original_currency/exchange_rate alongside (mirrors expenses).
-- contribution_delta is the signed amount added/withdrawn since the last
-- snapshot for investment accounts; null/0 for other kinds.
CREATE TABLE account_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL,
  contribution_delta NUMERIC,
  original_amount NUMERIC,
  original_currency TEXT,
  exchange_rate NUMERIC,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, recorded_at)
);

ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own account balances"
  ON account_balances FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own account balances"
  ON account_balances FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own account balances"
  ON account_balances FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own account balances"
  ON account_balances FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE INDEX account_balances_account_idx ON account_balances(account_id, recorded_at DESC);
CREATE INDEX account_balances_user_idx ON account_balances(user_id);


-- Sync trigger: after any change to account_balances, refresh the parent
-- account's current_balance (latest snapshot by recorded_at) and cost_basis
-- (running sum of contribution_delta for investment accounts).
CREATE OR REPLACE FUNCTION public.sync_account_from_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_account_id UUID;
  latest_balance NUMERIC;
  total_contributions NUMERIC;
  account_kind TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_account_id := OLD.account_id;
  ELSE
    target_account_id := NEW.account_id;
  END IF;

  SELECT kind INTO account_kind FROM accounts WHERE id = target_account_id;

  SELECT balance INTO latest_balance
  FROM account_balances
  WHERE account_id = target_account_id
  ORDER BY recorded_at DESC, created_at DESC
  LIMIT 1;

  IF account_kind = 'investment' THEN
    SELECT COALESCE(SUM(contribution_delta), 0) INTO total_contributions
    FROM account_balances
    WHERE account_id = target_account_id;
  ELSE
    total_contributions := 0;
  END IF;

  UPDATE accounts
  SET
    current_balance = COALESCE(latest_balance, 0),
    cost_basis = total_contributions,
    updated_at = now()
  WHERE id = target_account_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_account_from_balances() FROM PUBLIC;

CREATE TRIGGER account_balances_sync
  AFTER INSERT OR UPDATE OR DELETE ON account_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_account_from_balances();
