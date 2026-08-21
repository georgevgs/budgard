import type { Expense } from '@/types/Expense';

/**
 * Whether a transaction counts towards what you have spent.
 *
 * Three kinds of row live in the same table and only one of them is spending:
 *
 *   income          money arriving, never a cost
 *   debt_payment    an outflow, but it reduces a liability rather than
 *                   consuming anything, so it is excluded from spending
 *                   aggregations by long-standing convention (see the
 *                   `type` discriminator on Expense)
 *   is_excluded     money that moved without being spent — a transfer
 *                   between your own accounts, a cost a friend paid back
 *
 * This predicate is the single place that decision is made. Every total in
 * the app routes through it, because an exclusion honoured by four screens
 * and missed by a fifth is worse than no exclusion at all: the numbers stop
 * agreeing with each other and there is no way to tell which one is right.
 */
export const countsAsSpending = (expense: Expense): boolean => {
  if (expense.type === 'income') {
    return false;
  }
  if (expense.type === 'debt_payment') {
    return false;
  }

  return !expense.is_excluded;
};

/** Drops everything that is not spending. */
export const onlySpending = (expenses: Expense[]): Expense[] => {
  return expenses.filter(countsAsSpending);
};

/** Sums the spending in a list, ignoring anything that does not count. */
export const sumSpending = (expenses: Expense[]): number => {
  return expenses.reduce((sum, expense) => {
    if (!countsAsSpending(expense)) {
      return sum;
    }

    return sum + expense.amount;
  }, 0);
};
