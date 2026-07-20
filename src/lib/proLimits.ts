// Free-tier caps. Enforced in the UI; the paid tier removes them.
export const FREE_RECURRING_EXPENSE_LIMIT = 3;
export const FREE_ANALYTICS_MONTHS = 3;

export const canAddRecurringExpense = (
  isPro: boolean,
  currentCount: number,
): boolean => {
  if (isPro) return true;

  return currentCount < FREE_RECURRING_EXPENSE_LIMIT;
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
