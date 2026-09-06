const ONBOARDED_KEY = 'budgard_onboarded';
const ONBOARDING_STARTED_KEY = 'budgard_onboarding_started';
const ONBOARDING_STEP_KEY = 'budgard_onboarding_step';

const FIRST_STEP = 0;
const LAST_STEP = 3;

export const readOnboardingStep = (): number => {
  const stored = Number(localStorage.getItem(ONBOARDING_STEP_KEY));
  if (!Number.isInteger(stored) || stored < FIRST_STEP || stored > LAST_STEP) {
    return FIRST_STEP;
  }

  return stored;
};

export const startOnboarding = (): void => {
  localStorage.setItem(ONBOARDING_STARTED_KEY, 'true');
};

export const saveOnboardingStep = (step: number): void => {
  localStorage.setItem(ONBOARDING_STEP_KEY, String(step));
};

export const completeOnboarding = (): void => {
  localStorage.setItem(ONBOARDED_KEY, 'true');
  localStorage.removeItem(ONBOARDING_STARTED_KEY);
  localStorage.removeItem(ONBOARDING_STEP_KEY);
};

export const shouldShowOnboarding = (
  isInitialized: boolean,
  expenseCount: number,
  categoryCount: number,
  monthlyBudget: number | null,
): boolean => {
  if (!isInitialized) {
    return false;
  }
  if (localStorage.getItem(ONBOARDED_KEY) === 'true') {
    return false;
  }
  // Once a fresh user starts, setup remains resumable even though saving a
  // budget or category means the account is no longer technically empty.
  if (localStorage.getItem(ONBOARDING_STARTED_KEY) === 'true') {
    return true;
  }

  return expenseCount === 0 && categoryCount === 0 && monthlyBudget === null;
};
