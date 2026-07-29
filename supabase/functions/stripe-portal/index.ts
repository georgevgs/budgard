import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeadersFor, jsonResponder } from '../_shared/cors.ts';

// Creates a Stripe customer portal session for the authenticated user and
// returns its URL. The portal is Stripe-hosted and interoperates with Managed
// Payments; it is where subscribers cancel, update payment details, and view
// invoices — the app never implements those flows itself.

const STRIPE_PORTAL_URL = 'https://api.stripe.com/v1/billing_portal/sessions';

// Same version the stripe-checkout function charges with.
const STRIPE_API_VERSION = '2025-03-31.basil';

// Where the portal's "Return to Budgard" link points.
const RETURN_URL = 'https://budgard.com/settings';

Deno.serve(async (req) => {
  const jsonResponse = jsonResponder(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersFor(req) });
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

    // RLS scopes this to the caller's own subscription row. Without a row
    // there is no Stripe customer to open a portal for.
    const { data: subscription, error: subError } = await userClient
      .from('subscriptions')
      .select('stripe_customer_id')
      .maybeSingle();
    if (subError) {
      console.error('stripe-portal: subscription lookup failed:', subError);

      return jsonResponse({ error: 'Failed to open billing portal' }, 500);
    }
    if (!subscription?.stripe_customer_id) {
      return jsonResponse({ error: 'No subscription' }, 404);
    }

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secretKey) {
      console.error('stripe-portal: STRIPE_SECRET_KEY is not set');

      return jsonResponse({ error: 'Server misconfigured' }, 500);
    }

    const stripeResponse = await fetch(STRIPE_PORTAL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Stripe-Version': STRIPE_API_VERSION,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: subscription.stripe_customer_id,
        return_url: RETURN_URL,
      }),
    });

    if (!stripeResponse.ok) {
      const errorBody = await stripeResponse.text();
      console.error(
        `stripe-portal: Stripe returned ${stripeResponse.status}: ${errorBody}`,
      );

      return jsonResponse({ error: 'Failed to open billing portal' }, 502);
    }

    const session = await stripeResponse.json();
    if (!session?.url) {
      console.error('stripe-portal: response missing session URL');

      return jsonResponse({ error: 'Failed to open billing portal' }, 502);
    }

    return jsonResponse({ url: session.url }, 200);
  } catch (err) {
    console.error('stripe-portal error:', err);

    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
