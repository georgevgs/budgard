-- Budgard baseline schema (public).
-- Reconstructed from a live snapshot of the htamokfphaqudeivpowr project on
-- 2026-05-15 via Postgres catalog introspection (pg_dump was not available
-- locally — Docker prerequisite missing — and no scriptable Docker-free path
-- exists in the Supabase CLI for full schema dumps).
--
-- The file is written to be idempotent on re-replay (IF NOT EXISTS, DROP IF
-- EXISTS + CREATE for policies, CREATE OR REPLACE for functions) so the
-- later delta migrations in this folder can be applied on top of it cleanly.
-- Several of those deltas re-issue some of these statements (e.g. policy
-- re-creates for the auth.uid() init-plan fix in
-- 20260425000000_fix_rls_initplan_performance.sql); the idempotent shape
-- keeps that safe.

-- ===========================================================================
-- TABLES
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text NOT NULL,
  icon        text,
  type        text NOT NULL DEFAULT 'expense'
              CHECK (type = ANY (ARRAY['expense'::text, 'income'::text])),
  kind        text
              CHECK (kind IS NULL OR kind = ANY (ARRAY['need'::text, 'want'::text, 'savings'::text, 'income'::text])),
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT categories_user_id_name_key UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS public.tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '#6366f1',
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tags_user_id_name_key UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS public.accounts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name              text NOT NULL,
  kind              text NOT NULL
                    CHECK (kind = ANY (ARRAY['cash'::text, 'bank'::text, 'credit_card'::text, 'loan'::text, 'investment'::text, 'other'::text])),
  default_currency  text NOT NULL DEFAULT 'EUR',
  current_balance   numeric NOT NULL DEFAULT 0,
  cost_basis        numeric NOT NULL DEFAULT 0,
  icon              text NOT NULL DEFAULT 'wallet',
  color             text NOT NULL DEFAULT '#f97316',
  is_archived       boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.debts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  kind                text NOT NULL
                      CHECK (kind = ANY (ARRAY['credit_card'::text, 'student_loan'::text, 'mortgage'::text, 'auto_loan'::text, 'personal_loan'::text, 'medical'::text, 'other'::text])),
  original_principal  numeric NOT NULL CHECK (original_principal > 0),
  current_balance     numeric NOT NULL DEFAULT 0,
  apr                 numeric NOT NULL DEFAULT 0
                      CHECK (apr >= 0 AND apr <= 100),
  minimum_payment     numeric NOT NULL DEFAULT 0
                      CHECK (minimum_payment >= 0),
  currency            text NOT NULL DEFAULT 'EUR',
  start_date          date NOT NULL DEFAULT CURRENT_DATE,
  payoff_target_date  date,
  icon                text NOT NULL DEFAULT 'credit-card',
  color               text NOT NULL DEFAULT '#f97316',
  is_archived         boolean NOT NULL DEFAULT false,
  is_completed        boolean NOT NULL DEFAULT false,
  completed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount                numeric NOT NULL CHECK (amount > 0),
  description           text NOT NULL,
  category_id           uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  frequency             text NOT NULL
                        CHECK (frequency = ANY (ARRAY['weekly'::text, 'biweekly'::text, 'monthly'::text, 'quarterly'::text, 'yearly'::text])),
  start_date            date NOT NULL,
  end_date              date,
  last_generated_date   date,
  active                boolean DEFAULT true,
  type                  text NOT NULL DEFAULT 'expense'
                        CHECK (type = ANY (ARRAY['expense'::text, 'income'::text, 'debt_payment'::text])),
  linked_account_id     uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at            timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount                      numeric NOT NULL,
  description                 text NOT NULL,
  date                        date NOT NULL,
  category_id                 uuid REFERENCES public.categories(id),
  recurring_expense_id        uuid REFERENCES public.recurring_expenses(id) ON DELETE SET NULL,
  receipt_path                text,
  tag_id                      uuid REFERENCES public.tags(id) ON DELETE SET NULL,
  original_amount             numeric,
  original_currency           text,
  exchange_rate               numeric,
  type                        text NOT NULL DEFAULT 'expense'
                              CHECK (type = ANY (ARRAY['expense'::text, 'income'::text, 'debt_payment'::text])),
  savings_allocation_amount   numeric
                              CHECK (savings_allocation_amount IS NULL OR savings_allocation_amount >= 0),
  debt_id                     uuid REFERENCES public.debts(id) ON DELETE SET NULL,
  created_at                  timestamptz DEFAULT now(),
  CONSTRAINT expenses_recurring_date_unique UNIQUE (recurring_expense_id, date),
  CONSTRAINT expenses_debt_payment_consistency CHECK (
    (debt_id IS NULL AND type <> 'debt_payment')
    OR (debt_id IS NOT NULL AND type = 'debt_payment')
  )
);

CREATE TABLE IF NOT EXISTS public.expense_templates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount              numeric NOT NULL,
  description         text NOT NULL,
  category_id         uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  tag_id              uuid REFERENCES public.tags(id) ON DELETE SET NULL,
  original_currency   text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_budgets (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_amount       numeric NOT NULL
                       CHECK (monthly_amount > 0 AND monthly_amount <= 10000000),
  daily_reminder_hour  smallint
                       CHECK (daily_reminder_hour IS NULL OR (daily_reminder_hour >= 0 AND daily_reminder_hour <= 23)),
  default_savings_pct  numeric
                       CHECK (default_savings_pct IS NULL OR (default_savings_pct >= 0 AND default_savings_pct <= 100)),
  default_currency     text NOT NULL DEFAULT 'EUR',
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.category_budgets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id     uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  monthly_amount  numeric NOT NULL CHECK (monthly_amount > 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT category_budgets_user_id_category_id_key UNIQUE (user_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.goals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  target_amount   numeric NOT NULL CHECK (target_amount > 0),
  currency        text NOT NULL DEFAULT 'EUR',
  deadline        date,
  start_date      date NOT NULL DEFAULT CURRENT_DATE,
  source_type     text NOT NULL
                  CHECK (source_type = ANY (ARRAY['category'::text, 'tag'::text, 'net_delta'::text])),
  category_id     uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  tag_id          uuid REFERENCES public.tags(id) ON DELETE SET NULL,
  icon            text NOT NULL DEFAULT 'target',
  color           text NOT NULL DEFAULT '#f97316',
  is_completed    boolean NOT NULL DEFAULT false,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.account_balances (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id              uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  balance              numeric NOT NULL,
  contribution_delta   numeric,
  original_amount      numeric,
  original_currency    text,
  exchange_rate        numeric,
  recorded_at          date NOT NULL DEFAULT CURRENT_DATE,
  note                 text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_balances_account_id_recorded_at_key UNIQUE (account_id, recorded_at)
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ===========================================================================
-- INDEXES (non-PK / non-UNIQUE — those are created inline above)
-- ===========================================================================

CREATE INDEX IF NOT EXISTS idx_categories_user_id           ON public.categories      (user_id);
CREATE INDEX IF NOT EXISTS categories_user_type_idx         ON public.categories      (user_id, type);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id             ON public.expenses        (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id         ON public.expenses        (category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_recurring_expense_id ON public.expenses       (recurring_expense_id);
CREATE INDEX IF NOT EXISTS idx_expenses_tag_id              ON public.expenses        (tag_id) WHERE tag_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS expenses_date_idx                ON public.expenses        (date);
CREATE INDEX IF NOT EXISTS expenses_debt_id_idx             ON public.expenses        (debt_id) WHERE debt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS expenses_user_type_date_idx      ON public.expenses        (user_id, type, date DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_id     ON public.recurring_expenses (user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_category_id ON public.recurring_expenses (category_id);
CREATE INDEX IF NOT EXISTS recurring_expenses_user_type_idx   ON public.recurring_expenses (user_id, type);
CREATE INDEX IF NOT EXISTS recurring_expenses_linked_account_idx ON public.recurring_expenses (linked_account_id) WHERE linked_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expense_templates_user_id    ON public.expense_templates (user_id);
CREATE INDEX IF NOT EXISTS idx_expense_templates_category_id ON public.expense_templates (category_id);
CREATE INDEX IF NOT EXISTS idx_expense_templates_tag_id     ON public.expense_templates (tag_id);
CREATE INDEX IF NOT EXISTS accounts_user_id_idx             ON public.accounts        (user_id);
CREATE INDEX IF NOT EXISTS accounts_user_active_idx         ON public.accounts        (user_id, is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS account_balances_user_idx        ON public.account_balances (user_id);
CREATE INDEX IF NOT EXISTS account_balances_account_idx     ON public.account_balances (account_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS debts_user_id_idx                ON public.debts           (user_id);
CREATE INDEX IF NOT EXISTS debts_user_active_idx            ON public.debts           (user_id, is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS goals_user_id_idx                ON public.goals           (user_id);
CREATE INDEX IF NOT EXISTS goals_category_id_idx            ON public.goals           (category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS goals_tag_id_idx                 ON public.goals           (tag_id) WHERE tag_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS category_budgets_user_id_idx     ON public.category_budgets (user_id);
CREATE INDEX IF NOT EXISTS category_budgets_category_id_idx ON public.category_budgets (category_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id   ON public.push_subscriptions (user_id);

-- ===========================================================================
-- RLS ENABLE
-- ===========================================================================

ALTER TABLE public.categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_budgets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_budgets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_balances   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ===========================================================================
-- RLS POLICIES (owner-scoped via auth.uid())
-- ===========================================================================

-- categories
DROP POLICY IF EXISTS "Users can read own categories"   ON public.categories;
DROP POLICY IF EXISTS "Users can create categories"     ON public.categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
CREATE POLICY "Users can read own categories"   ON public.categories FOR SELECT TO authenticated USING  ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can create categories"     ON public.categories FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update own categories" ON public.categories FOR UPDATE TO authenticated USING  ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE TO authenticated USING  ((SELECT auth.uid()) = user_id);

-- tags
DROP POLICY IF EXISTS "Users can view their own tags"   ON public.tags;
DROP POLICY IF EXISTS "Users can insert their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON public.tags;
CREATE POLICY "Users can view their own tags"   ON public.tags FOR SELECT TO authenticated USING  ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert their own tags" ON public.tags FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own tags" ON public.tags FOR UPDATE TO authenticated USING  ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their own tags" ON public.tags FOR DELETE TO authenticated USING  ((SELECT auth.uid()) = user_id);

-- expenses
DROP POLICY IF EXISTS "Users can read own expenses"   ON public.expenses;
DROP POLICY IF EXISTS "Users can create expenses"     ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;
CREATE POLICY "Users can read own expenses"   ON public.expenses FOR SELECT TO authenticated USING  ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can create expenses"     ON public.expenses FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update own expenses" ON public.expenses FOR UPDATE TO authenticated USING  ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete own expenses" ON public.expenses FOR DELETE TO authenticated USING  ((SELECT auth.uid()) = user_id);

-- recurring_expenses
DROP POLICY IF EXISTS "Users can view their own recurring expenses"   ON public.recurring_expenses;
DROP POLICY IF EXISTS "Users can insert their own recurring expenses" ON public.recurring_expenses;
DROP POLICY IF EXISTS "Users can update their own recurring expenses" ON public.recurring_expenses;
DROP POLICY IF EXISTS "Users can delete their own recurring expenses" ON public.recurring_expenses;
CREATE POLICY "Users can view their own recurring expenses"   ON public.recurring_expenses FOR SELECT TO authenticated USING  ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert their own recurring expenses" ON public.recurring_expenses FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own recurring expenses" ON public.recurring_expenses FOR UPDATE TO authenticated USING  ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their own recurring expenses" ON public.recurring_expenses FOR DELETE TO authenticated USING  ((SELECT auth.uid()) = user_id);

-- expense_templates  (UPDATE policy added 2026-05-15 via tighten migration)
DROP POLICY IF EXISTS "Users can view their own templates"   ON public.expense_templates;
DROP POLICY IF EXISTS "Users can insert their own templates" ON public.expense_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.expense_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.expense_templates;
CREATE POLICY "Users can view their own templates"   ON public.expense_templates FOR SELECT TO authenticated USING  ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert their own templates" ON public.expense_templates FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own templates" ON public.expense_templates FOR UPDATE TO authenticated USING  ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their own templates" ON public.expense_templates FOR DELETE TO authenticated USING  ((SELECT auth.uid()) = user_id);

-- user_budgets
DROP POLICY IF EXISTS "Users can view own budget"   ON public.user_budgets;
DROP POLICY IF EXISTS "Users can insert own budget" ON public.user_budgets;
DROP POLICY IF EXISTS "Users can update own budget" ON public.user_budgets;
DROP POLICY IF EXISTS "Users can delete own budget" ON public.user_budgets;
CREATE POLICY "Users can view own budget"   ON public.user_budgets FOR SELECT TO authenticated USING  ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert own budget" ON public.user_budgets FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update own budget" ON public.user_budgets FOR UPDATE TO authenticated USING  ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete own budget" ON public.user_budgets FOR DELETE TO authenticated USING  ((SELECT auth.uid()) = user_id);

-- category_budgets
DROP POLICY IF EXISTS "Users can view their own category budgets"   ON public.category_budgets;
DROP POLICY IF EXISTS "Users can insert their own category budgets" ON public.category_budgets;
DROP POLICY IF EXISTS "Users can update their own category budgets" ON public.category_budgets;
DROP POLICY IF EXISTS "Users can delete their own category budgets" ON public.category_budgets;
CREATE POLICY "Users can view their own category budgets"   ON public.category_budgets FOR SELECT TO authenticated USING  ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert their own category budgets" ON public.category_budgets FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own category budgets" ON public.category_budgets FOR UPDATE TO authenticated USING  ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their own category budgets" ON public.category_budgets FOR DELETE TO authenticated USING  ((SELECT auth.uid()) = user_id);

-- accounts
DROP POLICY IF EXISTS "Users can view their own accounts"   ON public.accounts;
DROP POLICY IF EXISTS "Users can insert their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can update their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can delete their own accounts" ON public.accounts;
CREATE POLICY "Users can view their own accounts"   ON public.accounts FOR SELECT TO authenticated USING  ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert their own accounts" ON public.accounts FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own accounts" ON public.accounts FOR UPDATE TO authenticated USING  ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their own accounts" ON public.accounts FOR DELETE TO authenticated USING  ((SELECT auth.uid()) = user_id);

-- account_balances  (INSERT/UPDATE WITH CHECK also verifies account ownership)
DROP POLICY IF EXISTS "Users can view their own account balances"   ON public.account_balances;
DROP POLICY IF EXISTS "Users can insert their own account balances" ON public.account_balances;
DROP POLICY IF EXISTS "Users can update their own account balances" ON public.account_balances;
DROP POLICY IF EXISTS "Users can delete their own account balances" ON public.account_balances;
CREATE POLICY "Users can view their own account balances"   ON public.account_balances FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert their own account balances" ON public.account_balances FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_balances.account_id AND a.user_id = (SELECT auth.uid()))
  );
CREATE POLICY "Users can update their own account balances" ON public.account_balances FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_balances.account_id AND a.user_id = (SELECT auth.uid()))
  );
CREATE POLICY "Users can delete their own account balances" ON public.account_balances FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- debts
DROP POLICY IF EXISTS "Users can view their own debts"   ON public.debts;
DROP POLICY IF EXISTS "Users can insert their own debts" ON public.debts;
DROP POLICY IF EXISTS "Users can update their own debts" ON public.debts;
DROP POLICY IF EXISTS "Users can delete their own debts" ON public.debts;
CREATE POLICY "Users can view their own debts"   ON public.debts FOR SELECT TO authenticated USING  ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert their own debts" ON public.debts FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own debts" ON public.debts FOR UPDATE TO authenticated USING  ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their own debts" ON public.debts FOR DELETE TO authenticated USING  ((SELECT auth.uid()) = user_id);

-- goals
DROP POLICY IF EXISTS "Users can view their own goals"   ON public.goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.goals;
CREATE POLICY "Users can view their own goals"   ON public.goals FOR SELECT TO authenticated USING  ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert their own goals" ON public.goals FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own goals" ON public.goals FOR UPDATE TO authenticated USING  ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their own goals" ON public.goals FOR DELETE TO authenticated USING  ((SELECT auth.uid()) = user_id);

-- push_subscriptions
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ===========================================================================
-- FUNCTIONS  (all SET search_path TO 'public'; SECURITY DEFINER where noted)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.calculate_next_occurrence(p_frequency text, p_from_date date, p_start_date date)
RETURNS date LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  next_date DATE;
BEGIN
  IF p_from_date < p_start_date THEN
    RETURN p_start_date;
  END IF;
  CASE p_frequency
    WHEN 'weekly'    THEN next_date := p_from_date + INTERVAL '7 days';
    WHEN 'biweekly'  THEN next_date := p_from_date + INTERVAL '14 days';
    WHEN 'monthly'   THEN next_date := (p_from_date + INTERVAL '1 month')::DATE;
    WHEN 'quarterly' THEN next_date := (p_from_date + INTERVAL '3 months')::DATE;
    WHEN 'yearly'    THEN next_date := (p_from_date + INTERVAL '1 year')::DATE;
    ELSE next_date := (p_from_date + INTERVAL '1 month')::DATE;
  END CASE;
  RETURN next_date;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_recurring_expenses()
RETURNS void LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  next_date DATE;
  last_date DATE;
  interval_val INTERVAL;
BEGIN
  FOR rec IN
    SELECT * FROM public.recurring_expenses
    WHERE active = true AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  LOOP
    CASE rec.frequency
      WHEN 'weekly'    THEN interval_val := '1 week'::interval;
      WHEN 'biweekly'  THEN interval_val := '2 weeks'::interval;
      WHEN 'monthly'   THEN interval_val := '1 month'::interval;
      WHEN 'quarterly' THEN interval_val := '3 months'::interval;
      WHEN 'yearly'    THEN interval_val := '1 year'::interval;
    END CASE;
    IF rec.last_generated_date IS NOT NULL THEN
      next_date := rec.last_generated_date + interval_val;
    ELSE
      next_date := rec.start_date;
    END IF;
    last_date := NULL;
    WHILE next_date <= CURRENT_DATE LOOP
      INSERT INTO public.expenses (amount, description, category_id, date, user_id, recurring_expense_id, type)
      VALUES (rec.amount, rec.description, rec.category_id, next_date, rec.user_id, rec.id, rec.type)
      ON CONFLICT ON CONSTRAINT expenses_recurring_date_unique DO NOTHING;
      last_date := next_date;
      next_date := next_date + interval_val;
    END LOOP;
    IF last_date IS NOT NULL THEN
      UPDATE public.recurring_expenses SET last_generated_date = last_date WHERE id = rec.id;
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_recurring_expenses()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') OR
     (TG_OP = 'UPDATE' AND (NEW.active <> OLD.active OR NEW.start_date <> OLD.start_date OR NEW.frequency <> OLD.frequency))
  THEN
    PERFORM public.generate_recurring_expenses();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_upcoming_recurring_expenses(p_user_id uuid, p_days_ahead integer DEFAULT 30)
RETURNS TABLE(recurring_expense_id uuid, description text, amount numeric, category_id uuid, next_occurrence date, frequency text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id UUID;
  v_target_date DATE := CURRENT_DATE + (p_days_ahead || ' days')::INTERVAL;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_user_id != v_caller_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT
    re.id, re.description, re.amount, re.category_id,
    CASE WHEN re.last_generated_date IS NOT NULL THEN
      public.calculate_next_occurrence(re.frequency, re.last_generated_date, re.start_date)
    ELSE re.start_date END AS next_occurrence,
    re.frequency
  FROM public.recurring_expenses re
  WHERE re.user_id = v_caller_id
    AND re.active = true
    AND re.start_date <= v_target_date
    AND (re.end_date IS NULL OR re.end_date >= CURRENT_DATE)
    AND CASE WHEN re.last_generated_date IS NOT NULL THEN
      public.calculate_next_occurrence(re.frequency, re.last_generated_date, re.start_date)
    ELSE re.start_date END <= v_target_date
  ORDER BY next_occurrence;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_recurring_expenses(p_user_id uuid DEFAULT NULL::uuid, p_target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(generated_count integer, processed_recurring_ids uuid[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id UUID;
  v_recurring RECORD;
  v_next_date DATE;
  v_generated_count INT := 0;
  v_processed_ids UUID[] := ARRAY[]::UUID[];
  v_iteration_limit INT := 52;
  v_iteration_count INT;
  v_existing_count INT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_target_date > CURRENT_DATE + INTERVAL '1 year' THEN
    RAISE EXCEPTION 'target_date cannot be more than 1 year in the future';
  END IF;
  FOR v_recurring IN
    SELECT re.* FROM public.recurring_expenses re
    WHERE re.user_id = v_caller_id
      AND re.active = true
      AND re.start_date <= p_target_date
      AND (re.end_date IS NULL OR re.end_date >= p_target_date)
    ORDER BY re.created_at
    FOR UPDATE SKIP LOCKED
  LOOP
    v_iteration_count := 0;
    IF v_recurring.last_generated_date IS NOT NULL THEN
      v_next_date := public.calculate_next_occurrence(v_recurring.frequency, v_recurring.last_generated_date, v_recurring.start_date);
    ELSE
      v_next_date := v_recurring.start_date;
    END IF;
    WHILE v_next_date <= p_target_date
      AND v_iteration_count < v_iteration_limit
      AND (v_recurring.end_date IS NULL OR v_next_date <= v_recurring.end_date)
    LOOP
      SELECT COUNT(*) INTO v_existing_count FROM public.expenses
      WHERE recurring_expense_id = v_recurring.id AND date = v_next_date;
      IF v_existing_count = 0 THEN
        INSERT INTO public.expenses (user_id, amount, description, date, category_id, recurring_expense_id, type)
        VALUES (v_recurring.user_id, v_recurring.amount, v_recurring.description, v_next_date, v_recurring.category_id, v_recurring.id, v_recurring.type);
        v_generated_count := v_generated_count + 1;
      END IF;
      UPDATE public.recurring_expenses SET last_generated_date = v_next_date WHERE id = v_recurring.id;
      v_iteration_count := v_iteration_count + 1;
      v_next_date := public.calculate_next_occurrence(v_recurring.frequency, v_next_date, v_recurring.start_date);
    END LOOP;
    IF v_iteration_count > 0 THEN
      v_processed_ids := array_append(v_processed_ids, v_recurring.id);
    END IF;
  END LOOP;
  RETURN QUERY SELECT v_generated_count, v_processed_ids;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_all_recurring_expenses(p_target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(generated_count integer, processed_recurring_ids uuid[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_recurring RECORD;
  v_next_date DATE;
  v_generated_count INT := 0;
  v_processed_ids UUID[] := ARRAY[]::UUID[];
  v_iteration_limit INT := 52;
  v_iteration_count INT;
  v_existing_count INT;
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND current_user NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF p_target_date > CURRENT_DATE + INTERVAL '1 year' THEN
    RAISE EXCEPTION 'target_date cannot be more than 1 year in the future';
  END IF;
  FOR v_recurring IN
    SELECT re.* FROM public.recurring_expenses re
    WHERE re.active = true
      AND re.start_date <= p_target_date
      AND (re.end_date IS NULL OR re.end_date >= p_target_date)
    ORDER BY re.user_id, re.created_at
    FOR UPDATE SKIP LOCKED
  LOOP
    v_iteration_count := 0;
    IF v_recurring.last_generated_date IS NOT NULL THEN
      v_next_date := public.calculate_next_occurrence(v_recurring.frequency, v_recurring.last_generated_date, v_recurring.start_date);
    ELSE
      v_next_date := v_recurring.start_date;
    END IF;
    WHILE v_next_date <= p_target_date
      AND v_iteration_count < v_iteration_limit
      AND (v_recurring.end_date IS NULL OR v_next_date <= v_recurring.end_date)
    LOOP
      SELECT COUNT(*) INTO v_existing_count FROM public.expenses
      WHERE recurring_expense_id = v_recurring.id AND date = v_next_date;
      IF v_existing_count = 0 THEN
        INSERT INTO public.expenses (user_id, amount, description, date, category_id, recurring_expense_id, type)
        VALUES (v_recurring.user_id, v_recurring.amount, v_recurring.description, v_next_date, v_recurring.category_id, v_recurring.id, v_recurring.type);
        v_generated_count := v_generated_count + 1;
      END IF;
      UPDATE public.recurring_expenses SET last_generated_date = v_next_date WHERE id = v_recurring.id;
      v_iteration_count := v_iteration_count + 1;
      v_next_date := public.calculate_next_occurrence(v_recurring.frequency, v_next_date, v_recurring.start_date);
    END LOOP;
    IF v_iteration_count > 0 THEN
      v_processed_ids := array_append(v_processed_ids, v_recurring.id);
    END IF;
  END LOOP;
  RETURN QUERY SELECT v_generated_count, v_processed_ids;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_recurring_due_on(p_target_date date)
RETURNS TABLE(user_id uuid, recurring_expense_id uuid, description text, amount numeric, default_currency text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND current_user <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT re.user_id, re.id, re.description, re.amount, COALESCE(ub.default_currency, 'EUR')
  FROM public.recurring_expenses re
  LEFT JOIN public.user_budgets ub ON ub.user_id = re.user_id
  WHERE re.active = true
    AND re.start_date <= p_target_date
    AND (re.end_date IS NULL OR re.end_date >= p_target_date)
    AND CASE WHEN re.last_generated_date IS NOT NULL THEN
      public.calculate_next_occurrence(re.frequency, re.last_generated_date, re.start_date)
    ELSE re.start_date END = p_target_date;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_inactive_push_users(p_since_date date)
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND current_user <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT DISTINCT ps.user_id
  FROM public.push_subscriptions ps
  WHERE NOT EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.user_id = ps.user_id AND e.created_at >= p_since_date::timestamptz
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.recompute_debt_balance(p_debt_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  d RECORD;
  payment RECORD;
  balance NUMERIC;
  prev_date DATE;
  days_diff INT;
  daily_rate NUMERIC;
BEGIN
  SELECT id, original_principal, apr, start_date, completed_at INTO d
  FROM public.debts WHERE id = p_debt_id;
  IF NOT FOUND THEN RETURN; END IF;
  daily_rate := d.apr / 100.0 / 365.0;
  balance := d.original_principal;
  prev_date := d.start_date;
  FOR payment IN
    SELECT amount, date FROM public.expenses
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
  days_diff := GREATEST(CURRENT_DATE - prev_date, 0);
  IF days_diff > 0 AND balance > 0 THEN
    balance := balance + balance * daily_rate * days_diff;
  END IF;
  balance := GREATEST(balance, 0);
  UPDATE public.debts SET
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
$function$;

CREATE OR REPLACE FUNCTION public.sync_account_from_balances()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  target_account_id UUID;
  latest_balance NUMERIC;
  total_contributions NUMERIC;
  account_kind TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN target_account_id := OLD.account_id;
  ELSE target_account_id := NEW.account_id; END IF;
  SELECT kind INTO account_kind FROM public.accounts WHERE id = target_account_id;
  SELECT balance INTO latest_balance
  FROM public.account_balances
  WHERE account_id = target_account_id
  ORDER BY recorded_at DESC, created_at DESC LIMIT 1;
  IF account_kind = 'investment' THEN
    SELECT COALESCE(SUM(contribution_delta), 0) INTO total_contributions
    FROM public.account_balances WHERE account_id = target_account_id;
  ELSE total_contributions := 0; END IF;
  UPDATE public.accounts SET
    current_balance = COALESCE(latest_balance, 0),
    cost_basis = total_contributions,
    updated_at = now()
  WHERE id = target_account_id;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_debt_from_expenses()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.debt_id IS NOT NULL THEN PERFORM public.recompute_debt_balance(NEW.debt_id); END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.debt_id IS NOT NULL THEN PERFORM public.recompute_debt_balance(NEW.debt_id); END IF;
    IF OLD.debt_id IS NOT NULL AND OLD.debt_id IS DISTINCT FROM NEW.debt_id THEN
      PERFORM public.recompute_debt_balance(OLD.debt_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.debt_id IS NOT NULL THEN PERFORM public.recompute_debt_balance(OLD.debt_id); END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_linked_investment_contribution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_linked_account_id UUID;
  v_account_kind TEXT;
  v_existing_balance NUMERIC;
  v_recurring_description TEXT;
BEGIN
  IF NEW.recurring_expense_id IS NULL THEN RETURN NEW; END IF;
  SELECT linked_account_id, description INTO v_linked_account_id, v_recurring_description
  FROM public.recurring_expenses WHERE id = NEW.recurring_expense_id;
  IF v_linked_account_id IS NULL THEN RETURN NEW; END IF;
  SELECT kind, current_balance INTO v_account_kind, v_existing_balance
  FROM public.accounts WHERE id = v_linked_account_id;
  IF v_account_kind IS DISTINCT FROM 'investment' THEN RETURN NEW; END IF;
  INSERT INTO public.account_balances (account_id, user_id, balance, contribution_delta, recorded_at, note)
  VALUES (
    v_linked_account_id, NEW.user_id,
    COALESCE(v_existing_balance, 0) + NEW.amount, NEW.amount,
    NEW.date, 'Auto: ' || v_recurring_description
  )
  ON CONFLICT (account_id, recorded_at) DO UPDATE SET
    balance = public.account_balances.balance + EXCLUDED.contribution_delta,
    contribution_delta = COALESCE(public.account_balances.contribution_delta, 0) + EXCLUDED.contribution_delta;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_account_balance(
  p_account_id uuid, p_balance numeric,
  p_contribution_delta numeric DEFAULT NULL,
  p_recorded_at date DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_original_amount numeric DEFAULT NULL,
  p_original_currency text DEFAULT NULL,
  p_exchange_rate numeric DEFAULT NULL
)
RETURNS public.account_balances LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.account_balances;
BEGIN
  INSERT INTO public.account_balances AS ab (
    account_id, balance, contribution_delta, recorded_at, note,
    original_amount, original_currency, exchange_rate
  )
  VALUES (
    p_account_id, p_balance, p_contribution_delta,
    COALESCE(p_recorded_at, CURRENT_DATE),
    p_note, p_original_amount, p_original_currency, p_exchange_rate
  )
  ON CONFLICT (account_id, recorded_at) DO UPDATE SET
    balance = EXCLUDED.balance,
    contribution_delta = CASE
      WHEN ab.contribution_delta IS NULL AND EXCLUDED.contribution_delta IS NULL THEN NULL
      ELSE COALESCE(ab.contribution_delta, 0) + COALESCE(EXCLUDED.contribution_delta, 0)
    END,
    note = COALESCE(EXCLUDED.note, ab.note),
    original_amount = EXCLUDED.original_amount,
    original_currency = EXCLUDED.original_currency,
    exchange_rate = EXCLUDED.exchange_rate
  RETURNING ab.* INTO v_row;
  RETURN v_row;
END;
$function$;

-- ===========================================================================
-- TRIGGERS
-- ===========================================================================

DROP TRIGGER IF EXISTS update_user_budgets_updated_at ON public.user_budgets;
CREATE TRIGGER update_user_budgets_updated_at BEFORE UPDATE ON public.user_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS accounts_set_updated_at ON public.accounts;
CREATE TRIGGER accounts_set_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS goals_set_updated_at ON public.goals;
CREATE TRIGGER goals_set_updated_at BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS debts_set_updated_at ON public.debts;
CREATE TRIGGER debts_set_updated_at BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS category_budgets_set_updated_at ON public.category_budgets;
CREATE TRIGGER category_budgets_set_updated_at BEFORE UPDATE ON public.category_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_check_recurring_expenses ON public.recurring_expenses;
CREATE TRIGGER trigger_check_recurring_expenses AFTER INSERT OR UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.check_recurring_expenses();

DROP TRIGGER IF EXISTS account_balances_sync ON public.account_balances;
CREATE TRIGGER account_balances_sync AFTER INSERT OR UPDATE OR DELETE ON public.account_balances
  FOR EACH ROW EXECUTE FUNCTION public.sync_account_from_balances();

DROP TRIGGER IF EXISTS expenses_sync_debt ON public.expenses;
CREATE TRIGGER expenses_sync_debt AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.sync_debt_from_expenses();

DROP TRIGGER IF EXISTS expenses_sync_linked_investment ON public.expenses;
CREATE TRIGGER expenses_sync_linked_investment AFTER INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.sync_linked_investment_contribution();

-- ===========================================================================
-- GRANTS  (anon revoked for user-data discoverability; authenticated keeps
-- default Supabase grants; service_role is implicit)
-- ===========================================================================

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

REVOKE EXECUTE ON FUNCTION public.process_all_recurring_expenses(date)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_recurring_expenses(uuid, date)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_recurring_due_on(date)                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_inactive_push_users(date)                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_upcoming_recurring_expenses(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recompute_debt_balance(uuid)                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_next_occurrence(text, date, date)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_account_from_balances()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_debt_from_expenses()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_linked_investment_contribution()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()                   FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_all_recurring_expenses(date)        TO service_role;
GRANT EXECUTE ON FUNCTION public.process_recurring_expenses(uuid, date)      TO service_role;
GRANT EXECUTE ON FUNCTION public.get_recurring_due_on(date)                  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_inactive_push_users(date)               TO service_role;
GRANT EXECUTE ON FUNCTION public.get_upcoming_recurring_expenses(uuid, integer) TO service_role;
