import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeadersFor } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the JWT from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Deletion is irreversible, so a valid JWT alone is not enough: the
    // session's last authentication event (amr claim) must be recent. Session
    // refreshes keep the original amr timestamp, so a hijacked long-lived
    // session cannot destroy the account without access to the user's inbox.
    // The client verifies a fresh OTP right before calling this function.
    if (!isRecentlyAuthenticated(authHeader)) {
      return new Response(
        JSON.stringify({ error: 'reauth_required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Use the service role client to delete user data and auth record
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Delete receipt images from storage. Account deletion via the auth
    // cascade only removes DB rows, not storage objects, so without this the
    // user's images would persist indefinitely (GDPR right-to-erasure).
    // Paginated in case a user has more than the default 100-entry page.
    const STORAGE_PAGE_SIZE = 1000;
    let storagePageOffset = 0;
    while (true) {
      const { data: files } = await adminClient.storage
        .from('receipts')
        .list(user.id, { limit: STORAGE_PAGE_SIZE, offset: storagePageOffset });
      if (!files || files.length === 0) break;

      await adminClient.storage
        .from('receipts')
        .remove(files.map((f) => `${user.id}/${f.name}`));

      if (files.length < STORAGE_PAGE_SIZE) break;
      storagePageOffset += STORAGE_PAGE_SIZE;
    }

    // Delete the auth user. All public.* tables that reference auth.users.id
    // are configured with ON DELETE CASCADE, so the user's rows in expenses,
    // categories, tags, recurring_expenses, expense_templates, user_budgets,
    // accounts, account_balances, debts, goals, category_budgets,
    // push_subscriptions, user_ui_preferences, and feedback_reports all
    // delete automatically.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return new Response(
        JSON.stringify({ error: 'Failed to delete account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('delete-account error:', err);

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
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
