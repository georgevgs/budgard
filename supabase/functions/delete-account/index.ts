import { createClient } from 'supabase';
import { runAccountDeletion } from '../_shared/accountDeletion.ts';
import { corsHeadersFor } from '../_shared/cors.ts';
import { emptyStorageFolder } from '../_shared/storageCleanup.ts';
import { cancelStripeSubscription } from '../_shared/stripeBilling.ts';

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        ...corsHeaders,
        Allow: 'POST, OPTIONS',
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    // Get the JWT from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Create a Supabase client with the user's JWT to verify identity
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user is authenticated
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deletion is irreversible, so a valid JWT alone is not enough: the
    // session's last authentication event (amr claim) must be recent. Session
    // refreshes keep the original amr timestamp, so a hijacked long-lived
    // session cannot destroy the account without access to the user's inbox.
    // The client verifies a fresh OTP right before calling this function.
    if (!isRecentlyAuthenticated(authHeader)) {
      return new Response(JSON.stringify({ error: 'reauth_required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use the service role client to clean up server-owned resources and the
    // auth record. The key stays inside the Edge Function environment.
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    await runAccountDeletion({
      // Auth cascades do not remove Storage objects. Cleanup happens first so
      // a storage failure leaves the account intact and safely retryable.
      deleteReceipts: async () => {
        await emptyStorageFolder(
          adminClient.storage.from('receipts'),
          user.id,
        );
      },
      // Read billing before deleting auth: the cascade removes this row and
      // with it the only local link to the Stripe subscription.
      loadSubscription: async () => {
        const { data, error } = await adminClient
          .from('subscriptions')
          .select('stripe_subscription_id, status')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) {
          throw new Error('Subscription lookup failed');
        }

        return data;
      },
      // Immediate cancellation prevents another renewal after the account and
      // its billing portal are gone. The helper verifies already-canceled
      // subscriptions so retries remain safe after a partial failure.
      cancelSubscription: async (subscriptionId) => {
        if (!stripeSecretKey) {
          throw new Error('Stripe billing is not configured');
        }

        await cancelStripeSubscription({
          subscriptionId,
          secretKey: stripeSecretKey,
        });
      },
      // All public.* rows referencing auth.users cascade only after every
      // external cleanup step has succeeded.
      deleteAuthUser: async () => {
        const { error } = await adminClient.auth.admin.deleteUser(user.id);
        if (error) {
          throw new Error('Auth user deletion failed');
        }
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('delete-account error:', err);

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// --- Helpers ---

// How recent the session's newest authentication event must be for deletion
// to proceed. The client's re-verify flow completes in seconds; 10 minutes
// leaves room for slow typing and clock skew.
const REAUTH_WINDOW_SECONDS = 10 * 60;

type AmrEntry = { method?: string; timestamp?: number };

// Reads the amr (authentication methods reference) claim from the JWT that
// getUser() already validated, and checks its newest timestamp against the
// re-auth window. Fails closed: a token without a readable amr claim is
// treated as stale.
const isRecentlyAuthenticated = (authHeader: string): boolean => {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return false;

    const payloadJson = atob(
      payloadSegment.replace(/-/g, '+').replace(/_/g, '/'),
    );
    const payload = JSON.parse(payloadJson) as { amr?: AmrEntry[] };
    const timestamps = (payload.amr ?? [])
      .map((entry) => entry.timestamp)
      .filter((ts): ts is number => typeof ts === 'number');
    if (timestamps.length === 0) return false;

    const newestSeconds = Math.max(...timestamps);
    const ageSeconds = Date.now() / 1000 - newestSeconds;

    return ageSeconds <= REAUTH_WINDOW_SECONDS;
  } catch {
    return false;
  }
};
