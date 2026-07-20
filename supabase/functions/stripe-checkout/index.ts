import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Creates a Stripe (Managed Payments) subscription Checkout Session for the
// authenticated user and returns its URL. The user's id travels in
// subscription_data.metadata so the stripe-webhook function can attribute the
// resulting subscription back to them.

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://budgard.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_API_URL = 'https://api.stripe.com/v1/checkout/sessions';

// Managed Payments requires 2025-03-31.basil or later.
const STRIPE_API_VERSION = '2025-03-31.basil';

type Plan = 'monthly' | 'yearly';

// Mirrors isSubscriptionPro on the client. A user whose subscription is in
// one of these states must not reach checkout again — that would create a
// second Stripe subscription and a double charge.
const ACTIVE_STATUSES = ['trialing', 'active', 'past_due'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Durable per-user rate limit (5 attempts / 10 min, enforced in
    // Postgres). Checkout creates real Stripe objects, so it must not be
    // hammerable. Fail open on RPC errors for the same reason as the
    // subscription read below: a transient failure must not lose a sale.
    const { data: allowed, error: rateError } = await userClient.rpc(
      'consume_checkout_attempt',
    );
    if (rateError) {
      console.error('stripe-checkout: rate limit check failed:', rateError);
    }
    if (!rateError && allowed === false) {
      return jsonResponse({ error: 'Too many attempts. Try again soon.' }, 429);
    }

    // RLS scopes this to the caller's own row. Fail open on query errors:
    // blocking checkout over a transient read failure loses a sale, and the
    // webhook upsert keeps one row per user regardless.
    const { data: existing } = await userClient
      .from('subscriptions')
      .select('status')
      .maybeSingle();
    if (existing && ACTIVE_STATUSES.includes(existing.status)) {
      return jsonResponse({ error: 'Already subscribed' }, 409);
    }

    const plan = await readPlan(req);
    if (!plan) {
      return jsonResponse({ error: 'plan must be "monthly" or "yearly"' }, 400);
    }

    const priceId = getPriceId(plan);
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!priceId || !secretKey) {
      console.error('stripe-checkout: missing Stripe env configuration');

      return jsonResponse({ error: 'Server misconfigured' }, 500);
    }

    const stripeResponse = await fetch(STRIPE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Stripe-Version': STRIPE_API_VERSION,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: buildSessionParams(priceId, user.id, user.email),
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

    return jsonResponse({ url: session.url }, 200);
  } catch (err) {
    console.error('stripe-checkout error:', err);

    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

// --- Helpers ---

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

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
  if (email) {
    params.set('customer_email', email);
  }

  return params;
};
