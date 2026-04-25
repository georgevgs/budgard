-- Fix RLS initplan performance: replace auth.uid() with (SELECT auth.uid())
-- so the auth function is evaluated once per query instead of once per row.
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ══════════════════════════════════════════════════════════════════════════════
-- tags (4 policies)
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view their own tags" ON tags;
CREATE POLICY "Users can view their own tags" ON tags
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own tags" ON tags;
CREATE POLICY "Users can insert their own tags" ON tags
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own tags" ON tags;
CREATE POLICY "Users can update their own tags" ON tags
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own tags" ON tags;
CREATE POLICY "Users can delete their own tags" ON tags
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- user_budgets (4 policies)
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view own budget" ON user_budgets;
CREATE POLICY "Users can view own budget" ON user_budgets
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own budget" ON user_budgets;
CREATE POLICY "Users can insert own budget" ON user_budgets
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own budget" ON user_budgets;
CREATE POLICY "Users can update own budget" ON user_budgets
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own budget" ON user_budgets;
CREATE POLICY "Users can delete own budget" ON user_budgets
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- push_subscriptions (1 ALL policy, role: public)
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users manage own push subscriptions" ON push_subscriptions
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- expense_templates (3 policies)
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view their own templates" ON expense_templates;
CREATE POLICY "Users can view their own templates" ON expense_templates
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own templates" ON expense_templates;
CREATE POLICY "Users can insert their own templates" ON expense_templates
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own templates" ON expense_templates;
CREATE POLICY "Users can delete their own templates" ON expense_templates
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
