import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import { sumAmounts } from '@/constants/money';

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

/**
 * Whether a row counts towards a total of its own kind.
 *
 * `countsAsSpending` answers "is this money spent", so it rejects every income
 * row by design. Totals that have already picked a side — an income average, a
 * cash-flow income bar — need the other half of the question: the row is the
 * right kind, is it one the user excluded? Applying countsAsSpending there
 * silently zeroes the whole series.
 */
export const countsInTotals = (expense: Expense): boolean => {
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
  return sumAmounts(
    expenses.filter(countsAsSpending).map((expense) => expense.amount),
  );
};

/**
 * Whether a row is everyday spending: the part of the month a person steers
 * day to day.
 *
 * Two kinds of spending row are left out. A recurring bill was planned before
 * the month began, so rent landing on the 1st is not a day that ran hot. A
 * transfer into a savings category leaves the spending pool without being
 * consumed, so setting money aside must never read as overspending. The Today
 * status, its seven-day pace chart and the savings rhythm all measure pace, and
 * they have to agree on what pace is made of.
 */
export const countsAsEverydaySpending = (
  expense: Expense,
  savingsCategoryIds: ReadonlySet<string>,
): boolean => {
  if (!countsAsSpending(expense)) {
    return false;
  }
  if (expense.recurring_expense_id) {
    return false;
  }

  return !savingsCategoryIds.has(expense.category_id ?? '');
};

/** The ids of the categories a transfer into counts as setting money aside. */
export const buildSavingsCategoryIds = (categories: Category[]): Set<string> =>
  new Set(
    categories
      .filter((category) => category.kind === 'savings')
      .map((category) => category.id),
  );
