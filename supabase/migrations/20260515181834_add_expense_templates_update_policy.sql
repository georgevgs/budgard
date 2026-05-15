-- expense_templates was created with SELECT/INSERT/DELETE policies but no
-- UPDATE policy (supabase/migrations/20260424000000_add_expense_templates.sql).
-- With RLS on, this denies all updates — functional bug for users editing
-- templates. Add the standard owner-scoped UPDATE policy so the row state
-- before AND after the update both stay under the caller.

CREATE POLICY "Users can update their own templates" ON expense_templates
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
