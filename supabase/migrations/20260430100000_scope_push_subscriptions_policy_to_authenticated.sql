-- Scope the push_subscriptions RLS policy to the `authenticated` role to match
-- every other table in the schema. Functionally equivalent (the qual already
-- requires auth.uid() = user_id, and auth.uid() returns NULL for anon), but
-- the inconsistent role assignment makes audits noisier than they need to be.

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON push_subscriptions;

CREATE POLICY "Users manage own push subscriptions" ON push_subscriptions
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
