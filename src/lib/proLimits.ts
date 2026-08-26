// Free-tier caps. The gate that enforces them — and the message each one
// shows — lives in `proGates.ts`; these are just the numbers.
export const FREE_RECURRING_EXPENSE_LIMIT = 3;
const FREE_ANALYTICS_MONTHS = 3;
export const FREE_ACCOUNT_LIMIT = 3;
export const FREE_CATEGORY_LIMIT = 10;

// Free analytics cover the current month plus the two before it ("last 3
// months"). Returns the first day of the oldest visible month.
export const getFreeAnalyticsCutoff = (now: Date = new Date()): Date => {
  return new Date(
    now.getFullYear(),
    now.getMonth() - (FREE_ANALYTICS_MONTHS - 1),
    1,
  );
};
