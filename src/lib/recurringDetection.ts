import { addDays, addMonths, differenceInCalendarDays } from 'date-fns';
import { parseIsoDate, toIsoDate } from '@/lib/dates';
import type { Expense } from '@/types/Expense';
import type { RecurringExpense } from '@/types/RecurringExpense';
import type { RecurringSuggestion } from '@/types/RecurringSuggestion';

type Cadence = {
  frequency: RecurringExpense['frequency'];
  minimumDays: number;
  maximumDays: number;
};

const CADENCES: Cadence[] = [
  { frequency: 'weekly', minimumDays: 5, maximumDays: 9 },
  { frequency: 'biweekly', minimumDays: 12, maximumDays: 16 },
  { frequency: 'monthly', minimumDays: 25, maximumDays: 35 },
  { frequency: 'quarterly', minimumDays: 80, maximumDays: 100 },
  { frequency: 'yearly', minimumDays: 350, maximumDays: 380 },
];

export const detectRecurringSuggestions = (
  transactions: Expense[],
  recurring: RecurringExpense[],
  dismissed: ReadonlySet<string>,
): RecurringSuggestion[] => {
  const groups = groupCandidates(transactions);
  const existing = buildExistingKeys(recurring);
  const suggestions: RecurringSuggestion[] = [];

  for (const group of groups.values()) {
    const suggestion = buildSuggestion(group);
    if (!suggestion) {
      continue;
    }
    if (
      existing.has(
        buildExistingKey(suggestion.merchantPattern, suggestion.type),
      )
    ) {
      continue;
    }
    if (dismissed.has(suggestion.fingerprint)) {
      continue;
    }
    suggestions.push(suggestion);
  }

  return suggestions.sort((a, b) => b.occurrences - a.occurrences).slice(0, 5);
};

// --- Helpers ---

const normalizeMerchantPattern = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

const groupCandidates = (transactions: Expense[]): Map<string, Expense[]> => {
  const groups = new Map<string, Expense[]>();
  for (const transaction of transactions) {
    if (!canSuggest(transaction)) {
      continue;
    }
    const type = getType(transaction);
    const merchant = normalizeMerchantPattern(
      transaction.merchant_name ?? transaction.description,
    );
    const key = buildExistingKey(merchant, type);
    const group = groups.get(key) ?? [];
    group.push(transaction);
    groups.set(key, group);
  }

  return groups;
};

const canSuggest = (transaction: Expense): boolean => {
  if (transaction.amount <= 0) {
    return false;
  }
  if (transaction.recurring_expense_id) {
    return false;
  }
  if (transaction.debt_id || transaction.is_excluded) {
    return false;
  }

  return true;
};

const buildSuggestion = (unsorted: Expense[]): RecurringSuggestion | null => {
  if (unsorted.length < 3) {
    return null;
  }
  const transactions = [...unsorted].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const intervals = buildIntervals(transactions);
  const cadence = findCadence(intervals);
  if (!cadence) {
    return null;
  }
  if (!amountsAreStable(transactions)) {
    return null;
  }

  const latest = transactions[transactions.length - 1];
  const merchant = normalizeMerchantPattern(
    latest.merchant_name ?? latest.description,
  );
  const type = getType(latest);

  return {
    fingerprint: `${type}:${cadence.frequency}:${merchant}`,
    description: latest.merchant_name ?? latest.description,
    merchantPattern: merchant,
    amount: averageAmount(transactions),
    frequency: cadence.frequency,
    type,
    categoryId: latest.category_id ?? null,
    category: latest.category,
    nextDate: calculateNextDate(latest.date, cadence.frequency),
    occurrences: transactions.length,
  };
};

const buildIntervals = (transactions: Expense[]): number[] => {
  const intervals: number[] = [];
  for (let index = 1; index < transactions.length; index += 1) {
    intervals.push(
      differenceInCalendarDays(
        parseIsoDate(transactions[index].date),
        parseIsoDate(transactions[index - 1].date),
      ),
    );
  }

  return intervals;
};

const findCadence = (intervals: number[]): Cadence | null => {
  let best: Cadence | null = null;
  let bestScore = 0;
  for (const cadence of CADENCES) {
    const matching = intervals.filter(
      (days) => days >= cadence.minimumDays && days <= cadence.maximumDays,
    ).length;
    const score = matching / intervals.length;
    if (score >= 0.75 && score > bestScore) {
      best = cadence;
      bestScore = score;
    }
  }

  return best;
};

const amountsAreStable = (transactions: Expense[]): boolean => {
  const average = averageAmount(transactions);
  const tolerance = Math.max(average * 0.1, 2);

  return transactions.every(
    (transaction) => Math.abs(transaction.amount - average) <= tolerance,
  );
};

const averageAmount = (transactions: Expense[]): number => {
  const total = transactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  return Math.round((total / transactions.length) * 100) / 100;
};

const calculateNextDate = (
  date: string,
  frequency: RecurringExpense['frequency'],
): string => {
  const from = parseIsoDate(date);
  if (frequency === 'weekly') {
    return toIsoDate(addDays(from, 7));
  }
  if (frequency === 'biweekly') {
    return toIsoDate(addDays(from, 14));
  }
  if (frequency === 'quarterly') {
    return toIsoDate(addMonths(from, 3));
  }
  if (frequency === 'yearly') {
    return toIsoDate(addMonths(from, 12));
  }

  return toIsoDate(addMonths(from, 1));
};

const buildExistingKeys = (
  recurring: RecurringExpense[],
): ReadonlySet<string> => {
  const keys = recurring.map((item) => {
    const merchant = normalizeMerchantPattern(
      item.merchant_pattern ?? item.description,
    );

    return buildExistingKey(merchant, getRecurringType(item));
  });

  return new Set(keys);
};

const buildExistingKey = (
  merchant: string,
  type: 'expense' | 'income',
): string => `${type}:${merchant}`;

const getType = (transaction: Expense): 'expense' | 'income' => {
  if (transaction.type === 'income') {
    return 'income';
  }

  return 'expense';
};

const getRecurringType = (
  recurring: RecurringExpense,
): 'expense' | 'income' => {
  if (recurring.type === 'income') {
    return 'income';
  }

  return 'expense';
};
