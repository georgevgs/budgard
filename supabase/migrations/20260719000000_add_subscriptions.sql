-- Pro subscriptions, mirrored from Stripe (Managed Payments) webhooks.
-- One row per user (latest subscription wins on re-subscribe). Written only by
-- the stripe-webhook Edge Function via service role; clients have read-only
-- access to their own row. Status values follow Stripe subscription statuses.
-- Note: a cancelled-but-paid-up subscription keeps status 'active' with
-- cancel_at_period_end = true until the period ends, then flips to 'canceled'.
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN (
      'trialing', 'active', 'incomplete', 'incomplete_expired',
      'past_due', 'canceled', 'unpaid', 'paused'
    )
  ),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  trial_ends_at TIMESTAMPTZ,
  renews_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  livemode BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Read-only for the owner. No INSERT/UPDATE/DELETE policies: all writes go
-- through the service role in the stripe-webhook Edge Function.
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON subscriptions FROM anon;

CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
