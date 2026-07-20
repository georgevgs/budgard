-- Stripe delivers webhooks with no ordering guarantee, and retries can lag by
-- hours. The stripe-webhook function used a blind upsert, so a late-retried
-- older event (e.g. customer.subscription.updated with status 'active') could
-- overwrite the state written by a newer one (customer.subscription.deleted,
-- status 'canceled') and silently re-grant Pro after a cancellation.
--
-- Fix: record the Stripe event timestamp on the row and route writes through
-- a function whose upsert only applies when the incoming event is not older
-- than the one already applied.

ALTER TABLE subscriptions
  ADD COLUMN last_stripe_event_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.apply_subscription_event(
  p_user_id UUID,
  p_stripe_subscription_id TEXT,
  p_stripe_customer_id TEXT,
  p_stripe_price_id TEXT,
  p_status TEXT,
  p_cancel_at_period_end BOOLEAN,
  p_trial_ends_at TIMESTAMPTZ,
  p_renews_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_livemode BOOLEAN,
  p_event_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE sql
SET search_path = public
AS $$
  INSERT INTO subscriptions (
    user_id,
    stripe_subscription_id,
    stripe_customer_id,
    stripe_price_id,
    status,
    cancel_at_period_end,
    trial_ends_at,
    renews_at,
    ends_at,
    livemode,
    last_stripe_event_at
  ) VALUES (
    p_user_id,
    p_stripe_subscription_id,
    p_stripe_customer_id,
    p_stripe_price_id,
    p_status,
    p_cancel_at_period_end,
    p_trial_ends_at,
    p_renews_at,
    p_ends_at,
    p_livemode,
    p_event_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    stripe_customer_id     = EXCLUDED.stripe_customer_id,
    stripe_price_id        = EXCLUDED.stripe_price_id,
    status                 = EXCLUDED.status,
    cancel_at_period_end   = EXCLUDED.cancel_at_period_end,
    trial_ends_at          = EXCLUDED.trial_ends_at,
    renews_at              = EXCLUDED.renews_at,
    ends_at                = EXCLUDED.ends_at,
    livemode               = EXCLUDED.livemode,
    last_stripe_event_at   = EXCLUDED.last_stripe_event_at
  -- Equal timestamps must still apply: created + updated events for the same
  -- change routinely share a second. Only strictly older events are dropped.
  WHERE subscriptions.last_stripe_event_at <= EXCLUDED.last_stripe_event_at;
$$;

-- Only the stripe-webhook Edge Function (service role) may write.
REVOKE EXECUTE ON FUNCTION public.apply_subscription_event FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_subscription_event FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_subscription_event FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_subscription_event TO service_role;
