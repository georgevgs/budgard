export const ONBOARDED_KEY = 'budgard_onboarded';

export const shouldShowOnboarding = (
  isInitialized: boolean,
  expenseCount: number,
  categoryCount: number,
  monthlyBudget: number | null,
): boolean => {
  if (!isInitialized) return false;
  if (localStorage.getItem(ONBOARDED_KEY) === 'true') return false;

  return expenseCount === 0 && categoryCount === 0 && monthlyBudget === null;
};
