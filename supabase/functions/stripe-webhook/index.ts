import { createClient } from 'supabase';

// Stripe webhook receiver. Mirrors subscription state into the subscriptions
// table. Called by Stripe servers with a signed Stripe-Signature header
// (t=<timestamp>,v1=<hmac>) — no Supabase JWT, so this function must stay
// verify_jwt = false in config.toml.

// Reject events whose signature timestamp is older than this, to blunt
// replay attacks. Matches the tolerance Stripe's own SDKs use.
const TIMESTAMP_TOLERANCE_SECONDS = 300;

type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end?: number | null;
  cancel_at: number | null;
  ended_at: number | null;
  trial_end: number | null;
  livemode: boolean;
  metadata?: { user_id?: string };
  items: {
    data: Array<{
      current_period_end?: number | null;
      price: { id: string };
    }>;
  };
};

type WebhookEvent = {
  type: string;
  created: number;
  data: { object: StripeSubscription };
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) {
    console.error('stripe-webhook: STRIPE_WEBHOOK_SECRET is not set');

    return jsonResponse({ error: 'Server misconfigured' }, 500);
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get('Stripe-Signature') ?? '';

  const isValid = await verifySignature(rawBody, signatureHeader, secret);
  if (!isValid) {
    return jsonResponse({ error: 'Invalid signature' }, 401);
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  // Only subscription lifecycle events carry the subscription object this
  // function mirrors. Anything else subscribed in the dashboard is ignored.
  if (!event.type?.startsWith('customer.subscription.')) {
    return jsonResponse({ received: true }, 200);
  }

  const subscription = event.data.object;

  // A signed event whose livemode does not match this environment's Stripe
  // key means a test-mode event reached the live endpoint (or vice versa) —
  // most likely a webhook misconfiguration. Never mirror it into the
  // subscriptions table: a test subscription must not grant live Pro access.
  // 200 so Stripe does not retry a delivery that will never be accepted.
  const expectedLivemode = getExpectedLivemode();
  if (
    expectedLivemode !== null &&
    subscription.livemode !== expectedLivemode
  ) {
    console.error(
      `stripe-webhook: ignoring ${event.type} for ${subscription.id}: ` +
        `livemode=${subscription.livemode} but environment expects ${expectedLivemode}`,
    );

    return jsonResponse({ received: true }, 200);
  }

  const userId = subscription.metadata?.user_id;
  if (!userId) {
    // The subscription was created outside the app's checkout flow (which
    // always sets subscription_data.metadata.user_id). Nothing to attribute
    // it to; acknowledge so Stripe does not retry forever, but log it.
    console.error(
      `stripe-webhook: ${event.type} for ${subscription.id} has no user_id in metadata`,
    );

    return jsonResponse({ received: true }, 200);
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // apply_subscription_event upserts, but skips the write when the row was
  // last touched by a NEWER Stripe event — deliveries are unordered and
  // retried, and a stale 'active' must never overwrite a 'canceled'.
  const { error } = await adminClient.rpc(
    'apply_subscription_event',
    buildEventParams(userId, subscription, event.created),
  );

  if (error) {
    console.error('stripe-webhook: apply_subscription_event failed:', error);

    // Non-200 makes Stripe retry the delivery.
    return jsonResponse({ error: 'Failed to store subscription' }, 500);
  }

  return jsonResponse({ received: true }, 200);
});

// --- Helpers ---

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const buildEventParams = (
  userId: string,
  subscription: StripeSubscription,
  eventCreated: number | undefined,
) => {
  const firstItem = subscription.items?.data?.[0];

  return {
    p_user_id: userId,
    p_stripe_subscription_id: subscription.id,
    p_stripe_customer_id: subscription.customer,
    p_stripe_price_id: firstItem?.price?.id ?? '',
    p_status: subscription.status,
    p_cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    p_trial_ends_at: unixToIso(subscription.trial_end),
    // API version 2025-03-31.basil moved current_period_end onto the
    // subscription item; older event payloads still have it top-level.
    p_renews_at: unixToIso(
      firstItem?.current_period_end ?? subscription.current_period_end,
    ),
    p_ends_at: unixToIso(subscription.ended_at ?? subscription.cancel_at),
    p_livemode: subscription.livemode ?? true,
    // A payload missing `created` (never seen from Stripe) must still apply,
    // so it gets "now" rather than being dropped by the ordering guard.
    p_event_at: unixToIso(eventCreated) ?? new Date().toISOString(),
  };
};

// The environment's expected mode is derived from the secret key the other
// Stripe functions charge with (sk_live_/rk_live_ vs sk_test_/rk_test_), so
// no extra configuration can drift. Null (key not set) skips the check
// rather than dropping events over an unrelated misconfiguration.
const getExpectedLivemode = (): boolean | null => {
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!secretKey) return null;

  return secretKey.startsWith('sk_live_') || secretKey.startsWith('rk_live_');
};

const unixToIso = (seconds: number | null | undefined): string | null => {
  if (!seconds) return null;

  return new Date(seconds * 1000).toISOString();
};

// Stripe-Signature format: "t=<unix timestamp>,v1=<hmac>[,v1=<hmac>...]".
// The signed payload is "<timestamp>.<raw body>". Multiple v1 entries appear
// while a webhook secret is being rolled; any single match is valid.
const verifySignature = async (
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> => {
  if (!signatureHeader) return false;

  const parts = signatureHeader.split(',').map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith('t='));
  const signatures = parts
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3).toLowerCase());

  if (!timestampPart || signatures.length === 0) return false;

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp)) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - timestamp);
  if (ageSeconds > TIMESTAMP_TOLERANCE_SECONDS) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${timestamp}.${rawBody}`),
  );
  const expectedHex = bytesToHex(new Uint8Array(mac));

  return signatures.some((signature) =>
    timingSafeEqual(expectedHex, signature),
  );
};

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

// Constant-time string comparison so signature checks don't leak timing info.
const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
};
