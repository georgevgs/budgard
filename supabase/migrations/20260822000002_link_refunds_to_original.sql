-- Numbers audit, Aug 2026 — refunds get an audit trail.
--
-- A refund is written as a negative expense in the original's category, which
-- is the right shape: totals, budgets and analytics net out with no special
-- cases. But the credit had no link back to the charge it reversed, and two
-- things followed from that:
--
--   * The dialog capped each refund against the original amount rather than
--     against what had already been refunded, so a €50 charge could be
--     refunded €50 five times and net to −€200.
--   * There was no way, after the fact, to tell a refund from an ordinary
--     negative row, or to show the pair together.
--
-- ON DELETE SET NULL rather than CASCADE: deleting the original charge must
-- not silently delete money that came back. The refund becomes a standalone
-- negative row, which is what it is once its charge is gone.

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS refunded_expense_id UUID
    REFERENCES public.expenses(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.expenses.refunded_expense_id IS
  'For a refund row, the expense it reverses. Null for ordinary rows.';

-- A refund row is always negative and a charge is never a refund of itself.
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_refund_shape;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_refund_shape CHECK (
    refunded_expense_id IS NULL
    OR (amount < 0 AND refunded_expense_id <> id)
  );

-- Refunds are looked up by their original when the dialog works out how much
-- of a charge is still refundable. Partial: almost no row is a refund.
CREATE INDEX IF NOT EXISTS expenses_refunded_expense_id_idx
  ON public.expenses (refunded_expense_id)
  WHERE refunded_expense_id IS NOT NULL;
