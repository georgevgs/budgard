-- Add 'debt_payment' as a first-class transaction type.
-- Debt payoff should not inflate spending totals; making it a distinct type
-- means getExpenses (which filters .eq('type', 'expense')) excludes them
-- automatically, along with every downstream aggregation.

alter table public.expenses drop constraint expenses_type_check;
alter table public.expenses add constraint expenses_type_check
  check (type in ('expense', 'income', 'debt_payment'));

alter table public.recurring_expenses drop constraint recurring_expenses_type_check;
alter table public.recurring_expenses add constraint recurring_expenses_type_check
  check (type in ('expense', 'income', 'debt_payment'));

-- Backfill: every debt-linked expense becomes a debt_payment.
update public.expenses
  set type = 'debt_payment'
  where debt_id is not null
    and type = 'expense';

-- Invariant: debt-linked rows must be typed as debt_payment, and debt_payment
-- rows must reference a debt. Keeps the two representations in lockstep.
alter table public.expenses add constraint expenses_debt_payment_consistency
  check (
    (debt_id is null and type <> 'debt_payment')
    or (debt_id is not null and type = 'debt_payment')
  );