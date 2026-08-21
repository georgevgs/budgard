-- Two things a transaction needs before it can have a detail screen worth
-- opening.
--
-- `note` is the free text the description field cannot hold. The description
-- is what the row is called and has to stay short enough to scan in a list;
-- a note is why it happened, and people want to write a sentence.
--
-- `is_excluded` marks money that moved without being spending: a transfer
-- between your own accounts, an expense a friend paid you back for, a
-- duplicate you would rather keep than delete. Today the only way to keep
-- those out of a total is to delete the row, which loses the record. Every
-- spending aggregation must now skip these, but the Activity feed still
-- shows them — the row happened, it just does not count.
--
-- No `merchant` column yet. It would duplicate `description` until there is
-- an import source to populate it from, so it lands with bank connections.

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS is_excluded BOOLEAN NOT NULL DEFAULT false;

-- Bounded so a runaway paste cannot bloat every history fetch and the
-- localStorage snapshot along with it.
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_note_length CHECK (note IS NULL OR char_length(note) <= 2000);

COMMENT ON COLUMN public.expenses.note IS
  'Free-text note. Distinct from description, which is the row label.';
COMMENT ON COLUMN public.expenses.is_excluded IS
  'Money that moved but is not spending (transfers, reimbursed costs). Shown in Activity, skipped by every total.';

-- Excluded rows are a small minority, so a partial index keeps the common
-- "everything that counts" scan cheap without carrying the whole column.
CREATE INDEX IF NOT EXISTS expenses_excluded_idx
  ON public.expenses (user_id, date)
  WHERE is_excluded;
