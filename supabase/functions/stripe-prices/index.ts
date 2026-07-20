// Public, read-only endpoint returning the live Pro plan prices straight from
// Stripe, so what the UI displays can never drift from what checkout charges.
// The client falls back to compiled-in prices when this endpoint is
// unreachable. No auth: prices are public information and the landing page
// shows them to signed-out visitors. Must be verify_jwt = false in
// config.toml.

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://budgard.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_PRICE_URL = 'https://api.stripe.com/v1/prices';

// Same version the stripe-checkout function charges with.
const STRIPE_API_VERSION = '2025-03-31.basil';

// Prices change rarely; hold them in the isolate between requests so bursts
// of traffic do not fan out to the Stripe API.
const CACHE_TTL_MS = 10 * 60 * 1000;

type PlanPrice = {
  priceId: string;
  amount: number;
  currency: string;
  interval: string;
};

type PlansResponse = {
  monthly: PlanPrice;
  yearly: PlanPrice;
};

let cachedPlans: PlansResponse | null = null;
let cachedAt = 0;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const now = Date.now();
    if (cachedPlans && now - cachedAt < CACHE_TTL_MS) {
      return jsonResponse(cachedPlans, 200);
    }

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const monthlyId = Deno.env.get('STRIPE_PRICE_MONTHLY');
    const yearlyId = Deno.env.get('STRIPE_PRICE_YEARLY');
    if (!secretKey || !monthlyId || !yearlyId) {
      console.error('stripe-prices: missing Stripe env configuration');

      return jsonResponse({ error: 'Server misconfigured' }, 500);
    }

    const [monthly, yearly] = await Promise.all([
      fetchPrice(monthlyId, secretKey),
      fetchPrice(yearlyId, secretKey),
    ]);
    if (!monthly || !yearly) {
      return jsonResponse({ error: 'Failed to load prices' }, 502);
    }

    cachedPlans = { monthly, yearly };
    cachedAt = now;

    return jsonResponse(cachedPlans, 200);
  } catch (err) {
    console.error('stripe-prices error:', err);

    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

// --- Helpers ---

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      // Let browsers reuse the answer for an hour; the client additionally
      // keeps a longer-lived localStorage copy with its own fallback.
      'Cache-Control': 'public, max-age=3600',
    },
  });

const fetchPrice = async (
  priceId: string,
  secretKey: string,
): Promise<PlanPrice | null> => {
  const response = await fetch(`${STRIPE_PRICE_URL}/${priceId}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Stripe-Version': STRIPE_API_VERSION,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      `stripe-prices: Stripe returned ${response.status} for ${priceId}: ${errorBody}`,
    );

    return null;
  }

  const price = await response.json();
  if (typeof price?.unit_amount !== 'number' || !price?.currency) {
    console.error(`stripe-prices: unexpected price payload for ${priceId}`);

    return null;
  }

  return {
    priceId,
    amount: price.unit_amount,
    currency: String(price.currency).toUpperCase(),
    interval: price.recurring?.interval ?? 'month',
  };
};
