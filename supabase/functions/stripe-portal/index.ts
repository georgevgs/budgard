import { createClient } from 'supabase';
import { corsHeadersFor, jsonResponder } from '../_shared/cors.ts';
import { resolveStripeCustomerReference } from '../_shared/stripeBilling.ts';

// Creates a Stripe customer portal session for the authenticated user and
// returns its URL. The portal is Stripe-hosted and interoperates with Managed
// Payments; it is where subscribers cancel, update payment details, and view
// invoices — the app never implements those flows itself.

const STRIPE_PORTAL_URL = 'https://api.stripe.com/v1/billing_portal/sessions';

// Keep portal sessions on Stripe's current stable API version.
const STRIPE_API_VERSION = '2026-07-29.dahlia';

// Where the portal's "Return to Budgard" link points.
const RETURN_URL = 'https://budgard.com/settings';

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

    const portalParams = buildPortalParams(subscription.stripe_customer_id);
    if (!portalParams) {
      return jsonResponse({ error: 'Subscription has no Stripe billing' }, 409);
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
      body: portalParams,
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

// --- Helpers ---

const buildPortalParams = (customerId: string): URLSearchParams | null => {
  const customerReference = resolveStripeCustomerReference(customerId);
  if (!customerReference) {
    return null;
  }

  const params = new URLSearchParams({ return_url: RETURN_URL });
  params.set(customerReference.parameter, customerReference.id);

  return params;
};
