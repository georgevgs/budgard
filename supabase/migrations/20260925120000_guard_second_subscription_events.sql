-- subscriptions holds one row per user, but Stripe can hold more than one
-- subscription per customer — two Checkout sessions a day apart, or a new one
-- opened beside an unpaid subscription. apply_subscription_event only ordered
-- events by time, so whichever subscription spoke last owned the row: a
-- cancellation of the old subscription could overwrite the live new one and
-- strip Pro from someone who is still being charged.
--
-- Rule: an event about a DIFFERENT subscription may replace the row only if it
-- carries a Pro status, or if the row's own subscription is no longer live. A
-- new subscription still takes over the moment it starts; a stale one can no
-- longer knock a live one out. stripe-checkout now refuses unpaid and paused
-- rows, which removes the common way into this state; this covers the rest.
--
-- Signature, grants and the existing time ordering are unchanged.

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
SET search_path = ''
AS $$
  INSERT INTO public.subscriptions AS current_row (
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
  WHERE current_row.last_stripe_event_at <= EXCLUDED.last_stripe_event_at
    AND (
      current_row.stripe_subscription_id = EXCLUDED.stripe_subscription_id
      OR EXCLUDED.status IN ('trialing', 'active', 'past_due')
      OR current_row.status NOT IN (
        'trialing', 'active', 'past_due', 'unpaid', 'paused'
      )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.apply_subscription_event FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_subscription_event FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_subscription_event FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_subscription_event TO service_role;

-- Rollback: re-run apply_subscription_event from
-- 20260720000000_guard_subscription_event_ordering.sql.
