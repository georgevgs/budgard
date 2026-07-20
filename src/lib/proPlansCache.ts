import type { ProPlanPrices } from '@/lib/proPlans';

// Local snapshot of the live Stripe prices (same cache-then-network idea as
// subscriptionCache): the paywall and landing page paint real prices
// immediately, and the network refresh only runs when the snapshot is stale.

type StoredPlanPrices = {
  version: number;
  savedAt: string;
  prices: ProPlanPrices;
};

const CACHE_KEY = 'budgard-pro-plan-prices';

const CACHE_VERSION = 1;

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const loadPlanPricesSnapshot = (): ProPlanPrices | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }

    const stored = JSON.parse(raw) as StoredPlanPrices;
    if (stored.version !== CACHE_VERSION) {
      return null;
    }

    const age = Date.now() - new Date(stored.savedAt).getTime();
    if (!Number.isFinite(age) || age < 0 || age > MAX_AGE_MS) {
      return null;
    }

    if (!isStructurallyValid(stored.prices)) {
      return null;
    }

    return stored.prices;
  } catch {
    return null;
  }
};

export const savePlanPricesSnapshot = (prices: ProPlanPrices): void => {
  const stored: StoredPlanPrices = {
    version: CACHE_VERSION,
    savedAt: new Date().toISOString(),
    prices,
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(stored));
  } catch {
    // Quota exceeded or private mode — the fallback prices still work.
  }
};

// --- Helpers ---

const isStructurallyValid = (value: unknown): value is ProPlanPrices => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return isValidPlan(record.monthly) && isValidPlan(record.yearly);
};

const isValidPlan = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const plan = value as Record<string, unknown>;

  return (
    typeof plan.amount === 'number' &&
    plan.amount > 0 &&
    typeof plan.currency === 'string' &&
    /^[A-Za-z]{3}$/.test(plan.currency)
  );
};
