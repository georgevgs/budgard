const ONBOARDED_KEY = 'budgard_onboarded';
const ONBOARDING_STARTED_KEY = 'budgard_onboarding_started';
const ONBOARDING_STEP_KEY = 'budgard_onboarding_step';
const ONBOARDING_SEQUENCE_KEY = 'budgard_onboarding_sequence';
const CURRENT_SEQUENCE = 'categories-first';

const FIRST_STEP = 0;
const LAST_STEP = 3;

export const readOnboardingStep = (userId: string): number => {
  const stored = Number(
    localStorage.getItem(scopedKey(ONBOARDING_STEP_KEY, userId)),
  );
  if (!Number.isInteger(stored) || stored < FIRST_STEP || stored > LAST_STEP) {
    return FIRST_STEP;
  }

  if (
    localStorage.getItem(scopedKey(ONBOARDING_SEQUENCE_KEY, userId)) ===
    CURRENT_SEQUENCE
  ) {
    return stored;
  }

  // The first version stored numeric steps in expense-first order. Preserve a
  // resumed user's place when the two middle steps move around it.
  if (stored === 1) {
    return 2;
  }
  if (stored === 2) {
    return 1;
  }

  return stored;
};

export const startOnboarding = (userId: string): boolean => {
  if (!userId) {
    return false;
  }
  const wasStarted =
    localStorage.getItem(scopedKey(ONBOARDING_STARTED_KEY, userId)) === 'true';
  localStorage.setItem(scopedKey(ONBOARDING_STARTED_KEY, userId), 'true');
  localStorage.setItem(
    scopedKey(ONBOARDING_SEQUENCE_KEY, userId),
    CURRENT_SEQUENCE,
  );

  return !wasStarted;
};

export const saveOnboardingStep = (userId: string, step: number): void => {
  if (!userId) {
    return;
  }
  localStorage.setItem(scopedKey(ONBOARDING_STEP_KEY, userId), String(step));
  localStorage.setItem(
    scopedKey(ONBOARDING_SEQUENCE_KEY, userId),
    CURRENT_SEQUENCE,
  );
};

export const completeOnboarding = (userId: string): void => {
  if (!userId) {
    return;
  }
  localStorage.setItem(scopedKey(ONBOARDED_KEY, userId), 'true');
  localStorage.removeItem(scopedKey(ONBOARDING_STARTED_KEY, userId));
  localStorage.removeItem(scopedKey(ONBOARDING_STEP_KEY, userId));
  localStorage.removeItem(scopedKey(ONBOARDING_SEQUENCE_KEY, userId));
};

export const shouldShowOnboarding = (
  userId: string,
  isInitialized: boolean,
  expenseCount: number,
  categoryCount: number,
  monthlyBudget: number | null,
): boolean => {
  if (!userId || !isInitialized) {
    return false;
  }
  if (localStorage.getItem(scopedKey(ONBOARDED_KEY, userId)) === 'true') {
    return false;
  }
  // Once a fresh user starts, setup remains resumable even though saving a
  // budget or category means the account is no longer technically empty.
  if (
    localStorage.getItem(scopedKey(ONBOARDING_STARTED_KEY, userId)) === 'true'
  ) {
    return true;
  }

  return expenseCount === 0 && categoryCount === 0 && monthlyBudget === null;
};

const scopedKey = (key: string, userId: string): string => `${key}:${userId}`;
