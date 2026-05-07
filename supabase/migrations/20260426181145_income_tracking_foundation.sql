-- Income tracking: extend expenses, categories, recurring_expenses with type discriminator.
-- Add 50/30/20 kind on categories. Add savings allocation field. Add default savings %.

alter table public.expenses
  add column type text not null default 'expense'
  check (type in ('expense', 'income'));

alter table public.expenses
  add column savings_allocation_amount numeric
  check (savings_allocation_amount is null or savings_allocation_amount >= 0);

alter table public.categories
  add column type text not null default 'expense'
  check (type in ('expense', 'income'));

alter table public.categories
  add column kind text
  check (kind is null or kind in ('need', 'want', 'savings', 'income'));

alter table public.recurring_expenses
  add column type text not null default 'expense'
  check (type in ('expense', 'income'));

alter table public.user_budgets
  add column default_savings_pct numeric
  check (default_savings_pct is null or (default_savings_pct >= 0 and default_savings_pct <= 100));

create index if not exists expenses_user_type_date_idx
  on public.expenses (user_id, type, date desc);

create index if not exists categories_user_type_idx
  on public.categories (user_id, type);

create index if not exists recurring_expenses_user_type_idx
  on public.recurring_expenses (user_id, type);
