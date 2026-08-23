-- Data API grants and RLS are separate gates. Supabase projects created with
-- automatic exposure disabled do not add table grants, so a clean deployment
-- of the existing migrations otherwise returns 42501 before any owner-scoped
-- policy can run.
--
-- Opt in to deny-by-default for future public tables, then expose only the
-- operations the current app and its service-role jobs actually use.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES
  FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES
  FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE
  public.categories,
  public.tags,
  public.expenses,
  public.recurring_expenses,
  public.expense_templates,
  public.user_budgets,
  public.category_budgets,
  public.accounts,
  public.account_balances,
  public.debts,
  public.goals,
  public.push_subscriptions,
  public.no_spend_days,
  public.expense_tags,
  public.subscriptions
FROM anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tags TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.expenses TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recurring_expenses TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.expense_templates TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_budgets TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.category_budgets TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.accounts TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.account_balances TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.debts TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.goals TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.push_subscriptions TO authenticated, service_role;

GRANT SELECT, INSERT, DELETE ON TABLE public.no_spend_days TO authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.expense_tags TO authenticated, service_role;

-- Stripe is the only writer. Signed-in clients can only read their own row;
-- the existing SELECT-only RLS policy provides the row boundary.
GRANT SELECT ON TABLE public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subscriptions TO service_role;
