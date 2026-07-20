import type { ProPlanId } from '@/lib/proPlans';

// Remembers which Pro plan a signed-out visitor picked on the landing page,
// so the paid funnel survives the sign-in step: after auth the app reopens
// the upgrade flow on that plan instead of dead-ending at the dashboard.
// localStorage (not sessionStorage) because the email-OTP sign-in can span an
// app restart on mobile.

type StoredUpgradeIntent = {
  plan: ProPlanId;
  savedAt: string;
};

const INTENT_KEY = 'budgard-upgrade-intent';

// Long enough to finish sign-up at a leisurely pace, short enough that the
// dialog never ambushes someone days after an abandoned visit.
const MAX_AGE_MS = 60 * 60 * 1000;

export const saveUpgradeIntent = (plan: ProPlanId): void => {
  const stored: StoredUpgradeIntent = {
    plan,
    savedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(INTENT_KEY, JSON.stringify(stored));
  } catch {
    // localStorage unavailable — the visitor can still upgrade in-app.
  }
};

// Reads and clears the stored intent in one step so it can only ever fire
// once per landing-page choice.
export const consumeUpgradeIntent = (): ProPlanId | null => {
  try {
    const raw = localStorage.getItem(INTENT_KEY);
    if (!raw) {
      return null;
    }

    localStorage.removeItem(INTENT_KEY);

    const stored = JSON.parse(raw) as StoredUpgradeIntent;
    if (stored.plan !== 'monthly' && stored.plan !== 'yearly') {
      return null;
    }

    const age = Date.now() - new Date(stored.savedAt).getTime();
    if (!Number.isFinite(age) || age < 0 || age > MAX_AGE_MS) {
      return null;
    }

    return stored.plan;
  } catch {
    return null;
  }
};
