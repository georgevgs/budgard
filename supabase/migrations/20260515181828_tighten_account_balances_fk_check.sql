-- Tighten WITH CHECK on account_balances to validate that the referenced
-- account_id belongs to the caller. Without this, an authenticated user can
-- insert a balance row tied to another user's account_id (if guessed) by
-- setting user_id = self. RLS still blocks reading those rows back, but it
-- pollutes the victim's account history.

DROP POLICY IF EXISTS "Users can insert their own account balances" ON account_balances;
CREATE POLICY "Users can insert their own account balances" ON account_balances
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM accounts a
      WHERE a.id = account_balances.account_id
        AND a.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own account balances" ON account_balances;
CREATE POLICY "Users can update their own account balances" ON account_balances
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM accounts a
      WHERE a.id = account_balances.account_id
        AND a.user_id = (SELECT auth.uid())
    )
  );
