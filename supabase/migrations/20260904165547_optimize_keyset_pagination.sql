-- Match the equality predicates and complete descending cursor order used by
-- the expense/income history reader. The older three-column index remains
-- valid for existing query plans while this one adds stable page boundaries.
CREATE INDEX IF NOT EXISTS expenses_user_type_history_cursor_idx
  ON public.expenses (
    user_id,
    type,
    date DESC,
    created_at DESC,
    id DESC
  );

-- Debt detail reads the same transaction order through debt_id. The partial
-- predicate keeps ordinary expenses out of this smaller, purpose-built index.
CREATE INDEX IF NOT EXISTS expenses_debt_history_cursor_idx
  ON public.expenses (
    debt_id,
    date DESC,
    created_at DESC,
    id DESC
  )
  WHERE debt_id IS NOT NULL;

-- All-account net-worth history is owner-scoped and walks oldest to newest.
-- Per-account reads already use the unique (account_id, recorded_at) index.
CREATE INDEX IF NOT EXISTS account_balances_user_history_cursor_idx
  ON public.account_balances (user_id, recorded_at, id);
