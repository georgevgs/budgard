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

supabase.auth.onAuthStateChange((_event, session) => {
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
