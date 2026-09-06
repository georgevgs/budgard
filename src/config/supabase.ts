import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Bound every request so a "server down" that accepts the connection but never
// responds fails fast instead of hanging forever. An aborted read falls back to
// the snapshot cache; an aborted mutation becomes an AbortError, which
// isOfflineError() recognises so the change is saved locally and synced later.
// 15s is generous for the largest reads (full-history stream) yet bounds a
// black-hole server.
const REQUEST_TIMEOUT_MS = 15000;

const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);

  // Preserve any caller signal (dataService reads pass one for cancellation) by
  // combining it with the timeout when AbortSignal.any is available.
  let signal: AbortSignal = timeout;
  if (init?.signal) {
    if (typeof AbortSignal.any === 'function') {
      signal = AbortSignal.any([init.signal, timeout]);
    } else {
      // Older engine without AbortSignal.any: keep cancellation, skip timeout.
      signal = init.signal;
    }
  }

  return fetch(input, { ...init, signal });
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: fetchWithTimeout },
});
