-- Revoke SELECT (and writes) from the `anon` role on all user-data tables.
--
-- RLS already blocks every row for unauthenticated callers, but `anon` still
-- holds table-level GRANTs, so the tables appear in the auto-generated
-- pg_graphql schema pre-login (`pg_graphql_anon_table_exposed` advisor lint).
-- Removing the GRANTs hides the schema from the anonymous GraphQL view.
--
-- `authenticated` retains its grants — signed-in users still need to read /
-- write their own rows through PostgREST.

REVOKE ALL ON public.account_balances    FROM anon;
REVOKE ALL ON public.accounts            FROM anon;
REVOKE ALL ON public.categories          FROM anon;
REVOKE ALL ON public.category_budgets    FROM anon;
REVOKE ALL ON public.debts               FROM anon;
REVOKE ALL ON public.expense_templates   FROM anon;
REVOKE ALL ON public.expenses            FROM anon;
REVOKE ALL ON public.goals               FROM anon;
REVOKE ALL ON public.push_subscriptions  FROM anon;
REVOKE ALL ON public.recurring_expenses  FROM anon;
REVOKE ALL ON public.tags                FROM anon;
REVOKE ALL ON public.user_budgets        FROM anon;
