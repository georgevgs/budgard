import { createClient } from 'supabase';
import { corsHeadersFor, jsonResponder } from '../_shared/cors.ts';
import { isPasswordlessSession } from '../_shared/sessionAssurance.ts';
import {
  hasPriorStripeSubscription,
  resolveStripeCustomerReference,
  type StripeCustomerReference,
} from '../_shared/stripeBilling.ts';

// Creates a Stripe (Managed Payments) subscription Checkout Session for the
// authenticated user and returns its URL. The user's id travels in
// subscription_data.metadata so the stripe-webhook function can attribute the
// resulting subscription back to them.

const STRIPE_API_URL = 'https://api.stripe.com/v1/checkout/sessions';

// Managed Payments requires 2025-03-31.basil or later.
const STRIPE_API_VERSION = '2025-03-31.basil';

type Plan = 'monthly' | 'yearly';

// Mirrors isSubscriptionPro on the client. A user whose subscription is in
// one of these states must not reach checkout again — that would create a
// second Stripe subscription and a double charge.
const ACTIVE_STATUSES = ['trialing', 'active', 'past_due'];

// Still live in Stripe and resumable once paid or unpaused, but not Pro. A new
// Checkout here would open a second subscription beside the first — and the
// subscriptions row, one per user, can only track one of them. The portal is
// where these get settled.
const RESUMABLE_STATUSES = ['unpaid', 'paused'];

// First-time subscribers get a free trial; anyone with a subscription row —
// whatever its status — has already had one.
const TRIAL_PERIOD_DAYS = 7;

Deno.serve(async (req) => {
  const jsonResponse = jsonResponder(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersFor(req) });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401);
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Budgard never issues password sessions; one here was registered through
    // the raw auth API against an address its holder may not control.
    if (!isPasswordlessSession(authHeader)) {
      return jsonResponse({ error: 'reauth_required' }, 403);
    }

    const plan = await readPlan(req);
    if (!plan) {
      return jsonResponse({ error: 'plan must be "monthly" or "yearly"' }, 400);
    }

    // Durable per-user rate limit (5 attempts / 10 min, enforced in
    // Postgres). Checkout creates real Stripe objects, so it must not be
    // hammerable. Fail closed: a rate limiter that skips itself on errors is
    // only a soft control, and a 429 is retryable by the user — unlike the
    // subscription read below, where failing closed would lose the sale.
    const { data: allowed, error: rateError } = await userClient.rpc(
      'consume_checkout_attempt',
    );
    if (rateError) {
      console.error('stripe-checkout: rate limit check failed:', rateError);

      return jsonResponse({ error: 'Too many attempts. Try again soon.' }, 429);
    }
    if (allowed === false) {
      return jsonResponse({ error: 'Too many attempts. Try again soon.' }, 429);
    }

    // RLS scopes this to the caller's own row. Fail closed on query errors: an
    // active subscriber must never reach a second Checkout Session because a
    // transient database failure hid their current row.
    const { data: existing, error: subscriptionError } = await userClient
      .from('subscriptions')
      .select('status, stripe_customer_id')
      .maybeSingle();
    if (subscriptionError) {
      console.error(
        'stripe-checkout: subscription lookup failed:',
        subscriptionError,
      );

      return jsonResponse({ error: 'Unable to verify subscription' }, 503);
    }
    if (existing && ACTIVE_STATUSES.includes(existing.status)) {
      return jsonResponse({ error: 'Already subscribed' }, 409);
    }
    if (existing && RESUMABLE_STATUSES.includes(existing.status)) {
      return jsonResponse({ error: 'manage_billing' }, 409);
    }

    const customerReference = resolveStripeCustomerReference(
      existing?.stripe_customer_id,
    );
    if (existing && !customerReference) {
      console.error('stripe-checkout: stored Stripe customer id is invalid');

      return jsonResponse({ error: 'Unable to verify subscription' }, 503);
    }

    const priceId = getPriceId(plan);
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!priceId || !secretKey) {
      console.error('stripe-checkout: missing Stripe env configuration');

      return jsonResponse({ error: 'Server misconfigured' }, 500);
    }

    // Query failures returned above, so this decision is made only from a
    // successful read of the subscriptions row.
    const trialEligible =
      null === existing && (await hasNoStripeHistory(user.email, secretKey));

    const stripeResponse = await fetch(STRIPE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Stripe-Version': STRIPE_API_VERSION,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': buildIdempotencyKey(user.id, plan, trialEligible),
      },
      body: buildSessionParams(
        priceId,
        user.id,
        user.email,
        customerReference,
        trialEligible,
      ),
    });

    if (!stripeResponse.ok) {
      const errorBody = await stripeResponse.text();
      console.error(
        `stripe-checkout: Stripe returned ${stripeResponse.status}: ${errorBody}`,
      );

      return jsonResponse({ error: 'Failed to create checkout' }, 502);
    }

    const session = await stripeResponse.json();
    if (!session?.url) {
      console.error('stripe-checkout: response missing session URL');

      return jsonResponse({ error: 'Failed to create checkout' }, 502);
    }

    await replaceOpenSession(user.id, session.id, secretKey);

    return jsonResponse({ url: session.url }, 200);
  } catch (err) {
    console.error('stripe-checkout error:', err);

    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

// --- Helpers ---

// No subscriptions row means this account has never subscribed. The Stripe
// lookup covers the same person on an account they deleted and registered
// again. It fails open, refusing the trial on a Stripe hiccup would charge a
// new subscriber on the spot, which is worse than one repeated trial.
const hasNoStripeHistory = async (
  email: string | undefined,
  secretKey: string,
): Promise<boolean> => {
  if (undefined === email) {
    return true;
  }

  try {
    const hasHistory = await hasPriorStripeSubscription({ email, secretKey });

    return false === hasHistory;
  } catch (error) {
    console.error('stripe-checkout: trial history lookup failed:', error);

    return true;
  }
};

// Expires the user's previous open Checkout Session once a new one exists, so
// a monthly and a yearly session can never both be paid. It never throws, a
// failure here is logged and the new session's URL still goes back.
const replaceOpenSession = async (
  userId: string,
  sessionId: string,
  secretKey: string,
): Promise<void> => {
  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { data: stored, error: readError } = await adminClient
      .from('open_checkout_sessions')
      .select('stripe_session_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (null !== readError) {
      console.error('stripe-checkout: open session lookup failed:', readError);
    }

    const previousSessionId = storedSessionIdOrNull(stored);
    if (null !== previousSessionId && sessionId !== previousSessionId) {
      await expireSession(previousSessionId, secretKey);
    }

    const { error: storeError } = await adminClient
      .from('open_checkout_sessions')
      .upsert({ user_id: userId, stripe_session_id: sessionId });
    if (null !== storeError) {
      console.error(
        'stripe-checkout: storing open session failed:',
        storeError,
      );
    }
  } catch (error) {
    console.error('stripe-checkout: replacing open session failed:', error);
  }
};

const storedSessionIdOrNull = (
  stored: { stripe_session_id: string } | null,
): string | null => {
  if (null === stored) {
    return null;
  }

  return stored.stripe_session_id;
};

// Stripe refuses to expire a session that is already complete or expired.
// That is logged and left alone, only an open session needs closing.
const expireSession = async (
  sessionId: string,
  secretKey: string,
): Promise<void> => {
  const response = await fetch(`${STRIPE_API_URL}/${sessionId}/expire`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Stripe-Version': STRIPE_API_VERSION,
    },
  });
  if (false === response.ok) {
    const errorBody = await response.text();
    console.error(
      `stripe-checkout: expiring the previous session returned ${response.status}: ${errorBody}`,
    );
  }
};

const readPlan = async (req: Request): Promise<Plan | null> => {
  try {
    const body = await req.json();
    if (body?.plan === 'monthly' || body?.plan === 'yearly') {
      return body.plan;
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Collapses duplicate checkout requests onto one Stripe Checkout Session.
 *
 * Stripe stores an idempotency key's response and replays it for any request
 * repeating that key, so two tabs — or a double-tap, or a client retry after a
 * dropped response — land on the *same* Session instead of each creating their
 * own. A Session can only be completed once, and that is what actually stops
 * the double charge: the "Already subscribed" check above cannot, because it
 * reads the subscriptions table, which only the webhook writes, and the
 * webhook has not fired while both tabs are still sitting on the payment page.
 *
 * The key rotates every 30 minutes so someone who abandons checkout and wants
 * to start over is not pinned to a spent Session for the full 24 hours Stripe
 * retains a key. The race being closed lasts seconds, so a request landing
 * either side of a bucket boundary is not a meaningful hole.
 *
 * The plan is in the key, so a session for the other plan is a new one. Once
 * it opens, replaceOpenSession expires the previous session.
 */
const IDEMPOTENCY_WINDOW_MS = 30 * 60 * 1000;

const buildIdempotencyKey = (
  userId: string,
  plan: Plan,
  trialEligible: boolean,
): string => {
  const window = Math.floor(Date.now() / IDEMPOTENCY_WINDOW_MS);

  // Every input that changes the request body is in the key. Stripe rejects a
  // key replayed with different parameters, so omitting one would turn a
  // harmless retry into a hard error — `trialEligible` in particular flips
  // once a subscription row exists.
  return `checkout:${userId}:${plan}:${trialSegment(trialEligible)}:${window}`;
};

const trialSegment = (trialEligible: boolean): string => {
  if (trialEligible) {
    return 'trial';
  }

  return 'notrial';
};

const getPriceId = (plan: Plan): string | undefined => {
  if (plan === 'monthly') {
    return Deno.env.get('STRIPE_PRICE_MONTHLY');
  }

  return Deno.env.get('STRIPE_PRICE_YEARLY');
};

const buildSessionParams = (
  priceId: string,
  userId: string,
  email: string | undefined,
  customerReference: StripeCustomerReference | null,
  trialEligible: boolean,
): URLSearchParams => {
  const params = new URLSearchParams({
    mode: 'subscription',
    'managed_payments[enabled]': 'true',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: 'https://budgard.com/?checkout=success',
    cancel_url: 'https://budgard.com/?checkout=cancelled',
    client_reference_id: userId,
    'subscription_data[metadata][user_id]': userId,
  });
  if (customerReference) {
    params.set(customerReference.parameter, customerReference.id);
  } else if (email) {
    params.set('customer_email', email);
  }
  // Card is still collected up front (Checkout default); Stripe charges it
  // automatically when the trial ends. Managed Payments supports trials on
  // Checkout and sends the trial confirmation email itself.
  if (trialEligible) {
    params.set(
      'subscription_data[trial_period_days]',
      String(TRIAL_PERIOD_DAYS),
    );
  }

  return params;
};
