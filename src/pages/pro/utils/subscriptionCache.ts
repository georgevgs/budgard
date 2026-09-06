import type { Subscription } from '@/types/Subscription';

// Snapshot of the user's subscription row, persisted locally so the next app
// open knows Pro status immediately (cache-then-network, like dataCache).
// Without it every cold start treats a Pro user as free until the network
// fetch resolves, flashing paywalls at paying customers.
//
// A stale snapshot cannot grant Pro indefinitely: isSubscriptionPro also
// checks the paid-through dates stored on the row, and the background refresh
// replaces the snapshot as soon as the real row arrives.
type StoredSubscriptionSnapshot = {
  version: string;
  userId: string;
  savedAt: string;
  subscription: Subscription;
};

const CACHE_KEY = 'budgard-subscription-snapshot';

const CACHE_SCHEMA = 1;

// Replaced at build time by Vite's `define`. Fall back to 'dev' if it isn't
// (e.g. an unconfigured tool) so reading it can never throw at module load.
const APP_VERSION =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

const CACHE_VERSION = `${CACHE_SCHEMA}:${APP_VERSION}`;

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const loadSubscriptionSnapshot = (
  userId: string,
): Subscription | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }

    const stored = JSON.parse(raw) as StoredSubscriptionSnapshot;
    if (stored.version !== CACHE_VERSION) {
      return null;
    }
    if (stored.userId !== userId) {
      // Never leave another account's subscription behind on a shared device.
      clearSubscriptionSnapshot();

      return null;
    }

    const age = Date.now() - new Date(stored.savedAt).getTime();
    if (!Number.isFinite(age) || age < 0 || age > MAX_AGE_MS) {
      return null;
    }

    if (!isStructurallyValid(stored.subscription)) {
      return null;
    }

    return stored.subscription;
  } catch {
    return null;
  }
};

export const saveSubscriptionSnapshot = (
  userId: string,
  subscription: Subscription | null,
): void => {
  // A missing row means free tier — same as having no snapshot at all, so
  // store nothing and drop whatever an earlier Pro session left behind.
  if (!subscription) {
    clearSubscriptionSnapshot();

    return;
  }

  const stored: StoredSubscriptionSnapshot = {
    version: CACHE_VERSION,
    userId,
    savedAt: new Date().toISOString(),
    subscription,
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(stored));
  } catch {
    // Quota exceeded or private mode — drop the snapshot so we never keep a
    // stale one around.
    clearSubscriptionSnapshot();
  }
};

export const clearSubscriptionSnapshot = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // localStorage unavailable — nothing to clear.
  }
};

// --- Helpers ---

const isStructurallyValid = (value: unknown): value is Subscription => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.user_id === 'string' &&
    typeof record.status === 'string' &&
    typeof record.stripe_subscription_id === 'string'
  );
};
