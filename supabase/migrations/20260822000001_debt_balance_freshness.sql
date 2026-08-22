-- Numbers audit, Aug 2026 — the debt ledger.
--
-- `recompute_debt_balance` accrues interest forward to CURRENT_DATE and stores
-- the result, but it was only ever invoked by the expenses trigger. Three
-- consequences, all of which presented a stale figure as a current one:
--
--   1. A debt with no payment for six months carried a balance six months out
--      of date — and that figure feeds net worth, the debt headline and the
--      payoff planner's opening balance.
--   2. Editing a debt's APR, principal or start date recomputed nothing at
--      all. Correcting a mistyped 4.9% to 24.9% left the balance on the old
--      rate until the next payment happened to land.
--   3. Overpaying destroyed the excess: `GREATEST(balance, 0)` clamped it away
--      with no credit, no warning and no reversal path.
--
-- The accrual convention is stated here once and mirrored by
-- src/lib/debtPayoff.ts: daily simple interest at apr/365 on the outstanding
-- balance, accrued across the gap between ledger events. That is the consumer
-- credit "daily periodic rate" convention. We deliberately do not model
-- statement-cycle compounding, because statement dates are not stored.

-- ============================================================================
-- 1. Overpayment becomes a credit rather than vanishing
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recompute_debt_balance(p_debt_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d          RECORD;
  payment    RECORD;
  balance    NUMERIC;
  prev_date  DATE;
  days_diff  INT;
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
  balance    := d.original_principal;
  prev_date  := d.start_date;

  FOR payment IN
    SELECT amount, date FROM expenses
    WHERE debt_id = p_debt_id
    ORDER BY date ASC, created_at ASC
  LOOP
    days_diff := GREATEST(payment.date - prev_date, 0);
    IF days_diff > 0 AND balance > 0 THEN
      balance := balance + balance * daily_rate * days_diff;
    END IF;
    balance   := balance - payment.amount;
    prev_date := payment.date;
  END LOOP;

  -- Accrue from the last payment (or start_date) to today.
  days_diff := GREATEST(CURRENT_DATE - prev_date, 0);
  IF days_diff > 0 AND balance > 0 THEN
    balance := balance + balance * daily_rate * days_diff;
  END IF;

  -- Money is rounded to the cent here rather than carried at full precision,
  -- so the stored balance is a figure that can actually be paid.
  balance := ROUND(balance, 2);

  -- No GREATEST(balance, 0): an overpaid debt keeps its negative balance so
  -- the excess is visible as a credit instead of being silently destroyed.
  -- Consumers that mean "still owed" already test current_balance > 0.
  UPDATE debts
  SET
    current_balance = balance,
    is_completed    = (balance <= 0),
    completed_at    = CASE
      WHEN balance <= 0 AND d.completed_at IS NULL THEN now()
      WHEN balance > 0 THEN NULL
      ELSE d.completed_at
    END,
    updated_at      = now()
  WHERE id = p_debt_id;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_debt_balance(UUID) FROM PUBLIC, anon, authenticated;


-- ============================================================================
-- 2. Editing the terms recomputes the balance
--
-- recompute_debt_balance's own UPDATE touches only current_balance,
-- is_completed, completed_at and updated_at, so an `UPDATE OF` trigger on the
-- three term columns cannot re-enter it. The WHEN clause makes that explicit
-- rather than relying on the column list alone.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_debt_from_terms()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recompute_debt_balance(NEW.id);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_debt_from_terms() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS debts_sync_on_terms_change ON public.debts;
CREATE TRIGGER debts_sync_on_terms_change
  AFTER UPDATE OF apr, original_principal, start_date ON public.debts
  FOR EACH ROW
  WHEN (
    OLD.apr                IS DISTINCT FROM NEW.apr
    OR OLD.original_principal IS DISTINCT FROM NEW.original_principal
    OR OLD.start_date      IS DISTINCT FROM NEW.start_date
  )
  EXECUTE FUNCTION public.sync_debt_from_terms();


-- ============================================================================
-- 3. Balances are brought current when the user opens the app
--
-- Interest accrues every day, but nothing was recomputing it between payments.
-- Rather than add a cron dependency for a figure nobody reads while the app is
-- shut, the client calls this on load: the balance is then current exactly
-- when someone is looking at it. RLS-scoped to the caller, and a no-op when
-- every balance is already up to date.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_debt_balances()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_debt      RECORD;
  v_refreshed INT := 0;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  FOR v_debt IN
    SELECT d.id
    FROM debts d
    WHERE d.user_id      = v_caller_id
      AND d.is_archived  = false
      AND d.is_completed = false
      AND d.current_balance > 0
      AND d.apr > 0
      -- Already recomputed today; interest has not moved since.
      AND d.updated_at < date_trunc('day', now())
  LOOP
    PERFORM public.recompute_debt_balance(v_debt.id);
    v_refreshed := v_refreshed + 1;
  END LOOP;

  RETURN v_refreshed;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_debt_balances() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.refresh_debt_balances() TO authenticated, service_role;
