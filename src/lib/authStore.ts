import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

function readStoredSession(): Session | null {
  try {
    const key = Object.keys(localStorage).find(
      k => k.startsWith('sb-') && k.endsWith('-auth-token'),
    );
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

type AuthSnapshot = { session: Session | null; isLoading: boolean };

const stored = readStoredSession();
// Only trust the stored session if the access token is still fresh.
// An expired token causes a flicker: the app renders authenticated, then
// onAuthStateChange fires with null (refresh failed) and redirects to login.
const isTokenFresh =
  stored !== null &&
  (stored.expires_at ?? 0) > Math.floor(Date.now() / 1000) + 60;

let _snapshot: AuthSnapshot = {
  session: isTokenFresh ? stored : null,
  isLoading: !isTokenFresh,
};

const listeners = new Set<() => void>();

function notify(next: AuthSnapshot) {
  _snapshot = next;
  listeners.forEach(l => l());
}

// Track the last valid session so we can attempt recovery when iOS aborts
// Supabase's internal token refresh (which fires a spurious SIGNED_OUT).
let _lastKnownSession: Session | null = isTokenFresh ? stored : null;
let _recoveryTimer: ReturnType<typeof setTimeout> | null = null;
// Set to true before an explicit signOut() call so we don't try to recover.
let _intentionalSignOut = false;

export function markIntentionalSignOut() {
  _intentionalSignOut = true;
}

supabase.auth.onAuthStateChange((event, session) => {
  if (_recoveryTimer !== null) {
    clearTimeout(_recoveryTimer);
    _recoveryTimer = null;
  }

  if (session) {
    _lastKnownSession = session;
    notify({ session, isLoading: false });
    return;
  }

  // iOS PWA: when the app is backgrounded, Supabase's token refresh request
  // gets aborted, which triggers a spurious SIGNED_OUT with session=null.
  // If we have a previous valid session and this wasn't an intentional sign
  // out, hold the current session and attempt recovery with the old refresh
  // token before deciding to actually sign the user out.
  if (event === 'SIGNED_OUT' && _lastKnownSession && !_intentionalSignOut) {
    const refreshToken = _lastKnownSession.refresh_token;
    _recoveryTimer = setTimeout(() => {
      _recoveryTimer = null;
      supabase.auth
        .refreshSession({ refresh_token: refreshToken })
        .then(({ data, error }) => {
          if (data.session && !error) {
            _lastKnownSession = data.session;
            notify({ session: data.session, isLoading: false });
          } else {
            _lastKnownSession = null;
            notify({ session: null, isLoading: false });
          }
        })
        .catch(() => {
          _lastKnownSession = null;
          notify({ session: null, isLoading: false });
        });
    }, 2000);
    // Don't update the snapshot yet — keep the user on their current page.
    return;
  }

  _intentionalSignOut = false;
  _lastKnownSession = null;
  notify({ session, isLoading: false });
});

export const authStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): AuthSnapshot {
    return _snapshot;
  },
  getServerSnapshot(): AuthSnapshot {
    return { session: null, isLoading: true };
  },
};
