-- Debts: dedicated payoff tracker for liabilities (credit cards, loans, etc.).
-- Differs from liability `accounts` (which only carry balance snapshots) by
-- storing APR, minimum payment, and original principal so the app can run
-- amortization replays and snowball/avalanche projections.
--
-- Payments are regular `expenses` rows linked via expenses.debt_id.
-- The sync_debt_from_expenses trigger replays the payment ledger after any
-- INSERT/UPDATE/DELETE on expenses, keeping current_balance accurate using
-- daily simple interest accrual (matches consumer-grade payoff calculators;
-- we deliberately don't model per-cycle compounding since we don't store
-- statement dates).
CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('credit_card','student_loan','mortgage','auto_loan','personal_loan','medical','other')),
  original_principal NUMERIC NOT NULL CHECK (original_principal > 0),
  current_balance NUMERIC NOT NULL DEFAULT 0,
  apr NUMERIC NOT NULL DEFAULT 0 CHECK (apr >= 0 AND apr <= 100),
  minimum_payment NUMERIC NOT NULL DEFAULT 0 CHECK (minimum_payment >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payoff_target_date DATE,
  icon TEXT NOT NULL DEFAULT 'credit-card',
  color TEXT NOT NULL DEFAULT '#f97316',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own debts"
  ON debts FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own debts"
  ON debts FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own debts"
  ON debts FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own debts"
  ON debts FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE INDEX debts_user_id_idx ON debts(user_id);
CREATE INDEX debts_user_active_idx ON debts(user_id, is_archived) WHERE is_archived = false;

CREATE TRIGGER debts_set_updated_at
  BEFORE UPDATE ON debts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- Link payments to debts. ON DELETE SET NULL keeps the expense in transaction
-- history if the debt is later removed (don't lose the spending record).
ALTER TABLE expenses
  ADD COLUMN debt_id UUID REFERENCES debts(id) ON DELETE SET NULL;

CREATE INDEX expenses_debt_id_idx ON expenses(debt_id) WHERE debt_id IS NOT NULL;


CREATE OR REPLACE FUNCTION public.recompute_debt_balance(p_debt_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d RECORD;
  payment RECORD;
  balance NUMERIC;
  prev_date DATE;
  days_diff INT;
  daily_rate NUMERIC;
BEGIN
  SELECT id, original_principal, apr, start_date, completed_at
    INTO d
  FROM debts
  WHERE id = p_debt_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  daily_rate := d.apr / 100.0 / 365.0;
  balance := d.original_principal;
  prev_date := d.start_date;

  FOR payment IN
    SELECT amount, date FROM expenses
    WHERE debt_id = p_debt_id
    ORDER BY date ASC, created_at ASC
  LOOP
    days_diff := GREATEST(payment.date - prev_date, 0);
    IF days_diff > 0 AND balance > 0 THEN
      balance := balance + balance * daily_rate * days_diff;
    END IF;
    balance := balance - payment.amount;
    prev_date := payment.date;
  END LOOP;

  -- accrue interest from the last payment (or start_date) to today
  days_diff := GREATEST(CURRENT_DATE - prev_date, 0);
  IF days_diff > 0 AND balance > 0 THEN
    balance := balance + balance * daily_rate * days_diff;
  END IF;

  balance := GREATEST(balance, 0);

  UPDATE debts
  SET
    current_balance = balance,
    is_completed = (balance <= 0),
    completed_at = CASE
      WHEN balance <= 0 AND d.completed_at IS NULL THEN now()
      WHEN balance > 0 THEN NULL
      ELSE d.completed_at
    END,
    updated_at = now()
  WHERE id = p_debt_id;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_debt_balance(UUID) FROM PUBLIC;


CREATE OR REPLACE FUNCTION public.sync_debt_from_expenses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.debt_id IS NOT NULL THEN
      PERFORM public.recompute_debt_balance(NEW.debt_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.debt_id IS NOT NULL THEN
      PERFORM public.recompute_debt_balance(NEW.debt_id);
    END IF;
    IF OLD.debt_id IS NOT NULL AND OLD.debt_id IS DISTINCT FROM NEW.debt_id THEN
      PERFORM public.recompute_debt_balance(OLD.debt_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.debt_id IS NOT NULL THEN
      PERFORM public.recompute_debt_balance(OLD.debt_id);
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_debt_from_expenses() FROM PUBLIC;

CREATE TRIGGER expenses_sync_debt
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_debt_from_expenses();
