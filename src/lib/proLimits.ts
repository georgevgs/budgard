// Free-tier caps. Enforced in the UI; the paid tier removes them.
export const FREE_RECURRING_EXPENSE_LIMIT = 3;
const FREE_ANALYTICS_MONTHS = 3;
export const FREE_ACCOUNT_LIMIT = 3;
export const FREE_CATEGORY_LIMIT = 10;

export const canAddRecurringExpense = (
  isPro: boolean,
  currentCount: number,
): boolean => {
  if (isPro) return true;

  return currentCount < FREE_RECURRING_EXPENSE_LIMIT;
};

// Counts active (non-archived) accounts only — archiving frees a slot,
// matching the DB trigger in 20260727000001.
export const canAddAccount = (
  isPro: boolean,
  activeAccountCount: number,
): boolean => {
  if (isPro) return true;

  return activeAccountCount < FREE_ACCOUNT_LIMIT;
};

// Counted per category type (expense and income separately) — the onboarding
// seed adds at most 8, so new users always start under the cap.
export const canAddCategory = (
  isPro: boolean,
  currentTypeCount: number,
): boolean => {
  if (isPro) return true;

  return currentTypeCount < FREE_CATEGORY_LIMIT;
};

// Free analytics cover the current month plus the two before it ("last 3
// months"). Returns the first day of the oldest visible month.
export const getFreeAnalyticsCutoff = (now: Date = new Date()): Date => {
  return new Date(
    now.getFullYear(),
    now.getMonth() - (FREE_ANALYTICS_MONTHS - 1),
    1,
  );
};
