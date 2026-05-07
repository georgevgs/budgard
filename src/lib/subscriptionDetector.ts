import { differenceInDays, parseISO } from 'date-fns';
import type { Expense } from '@/types/Expense';
import type { RecurringExpense } from '@/types/RecurringExpense';
import { WEEKS_PER_MONTH, BIWEEKLY_PERIODS_PER_MONTH } from '@/lib/recurring';

const PRICE_DRIFT_THRESHOLD_PCT = 5;

export type PriceDrift = {
  recurringExpenseId: string;
  configuredAmount: number;
  latestAmount: number;
  latestDate: string;
  deltaPct: number;
};

export const detectPriceDrift = (
  recurring: RecurringExpense,
  expenses: Expense[],
): PriceDrift | null => {
  if (!recurring.active) return null;
  if (recurring.amount === 0) return null;

  const linked = expenses.filter((e) => e.recurring_expense_id === recurring.id);
  if (linked.length === 0) return null;

  const latest = linked.reduce((acc, e) => {
    if (parseISO(e.date) > parseISO(acc.date)) return e;
    return acc;
  });

  const deltaPct = ((latest.amount - recurring.amount) / recurring.amount) * 100;

  if (Math.abs(deltaPct) < PRICE_DRIFT_THRESHOLD_PCT) return null;

  return {
    recurringExpenseId: recurring.id,
    configuredAmount: recurring.amount,
    latestAmount: latest.amount,
    latestDate: latest.date,
    deltaPct,
  };
};

export type DetectedSubscription = {
  description: string;
  normalizedDescription: string;
  amount: number;
  frequency: RecurringExpense['frequency'];
  occurrences: number;
  category_id: string | null;
  lastDate: string;
};

type CadenceWindow = {
  frequency: RecurringExpense['frequency'];
  min: number;
  max: number;
};

const CADENCE_WINDOWS: CadenceWindow[] = [
  { frequency: 'weekly', min: 6, max: 8 },
  { frequency: 'biweekly', min: 12, max: 16 },
  { frequency: 'monthly', min: 26, max: 34 },
  { frequency: 'quarterly', min: 85, max: 95 },
  { frequency: 'yearly', min: 355, max: 375 },
];

const MIN_OCCURRENCES = 3;
const MAX_AMOUNT_VARIANCE_PCT = 10;
const MAX_RESULTS = 5;

export const detectSubscriptions = (
  expenses: Expense[],
  existingRecurring: RecurringExpense[] = [],
): DetectedSubscription[] => {
  const candidates = expenses.filter((e) => !e.recurring_expense_id);
  const groups = groupByNormalizedDescription(candidates);

  const alreadyTracked = new Set(
    existingRecurring.map((r) => normalizeDescription(r.description)),
  );

  const detected: DetectedSubscription[] = [];

  for (const [normalizedDescription, group] of groups) {
    if (group.length < MIN_OCCURRENCES) continue;
    if (alreadyTracked.has(normalizedDescription)) continue;

    const detection = analyzeGroup(group, normalizedDescription);
    if (detection) {
      detected.push(detection);
    }
  }

  return detected
    .sort((a, b) => scoreDetection(b) - scoreDetection(a))
    .slice(0, MAX_RESULTS);
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const normalizeDescription = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[#*]/g, '')
    .replace(/\s+\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?$/, '')
    .replace(/\s+\d{4}[/-]\d{1,2}([/-]\d{1,2})?$/, '')
    .replace(/\s+\d{4,}$/, '')
    .trim();

const groupByNormalizedDescription = (
  expenses: Expense[],
): Map<string, Expense[]> => {
  const groups = new Map<string, Expense[]>();

  for (const e of expenses) {
    if (!e.description) continue;
    const key = normalizeDescription(e.description);
    if (!key) continue;

    let bucket = groups.get(key);
    if (!bucket) {
      bucket = [];
      groups.set(key, bucket);
    }
    bucket.push(e);
  }

  return groups;
};

const analyzeGroup = (
  group: Expense[],
  normalizedDescription: string,
): DetectedSubscription | null => {
  const sorted = [...group].sort(
    (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime(),
  );

  const deltas = computeDeltas(sorted);
  if (deltas.length === 0) return null;

  const medianDelta = median(deltas);
  const cadence = matchCadence(medianDelta);
  if (!cadence) return null;

  const amounts = sorted.map((e) => e.amount);
  const medianAmount = median(amounts);
  if (!isAmountStable(amounts, medianAmount)) return null;

  // Use the latest occurrence as the suggested amount, not the median. If the
  // user accepts the suggestion we want them tracking today's price, not the
  // historical average — slow upward drift would otherwise be silently smoothed
  // out. The isAmountStable check above still uses the median to keep the
  // outlier rejection symmetric.
  const latest = sorted[sorted.length - 1];

  return {
    description: pickBestDescription(sorted),
    normalizedDescription,
    amount: latest.amount,
    frequency: cadence,
    occurrences: sorted.length,
    category_id: pickMostCommonCategoryId(sorted),
    lastDate: latest.date,
  };
};

const computeDeltas = (sorted: Expense[]): number[] => {
  const deltas: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    deltas.push(
      differenceInDays(parseISO(sorted[i].date), parseISO(sorted[i - 1].date)),
    );
  }

  return deltas;
};

const matchCadence = (
  medianDelta: number,
): RecurringExpense['frequency'] | null => {
  for (const window of CADENCE_WINDOWS) {
    if (medianDelta >= window.min && medianDelta <= window.max) {
      return window.frequency;
    }
  }

  return null;
};

const isAmountStable = (amounts: number[], medianAmount: number): boolean => {
  if (medianAmount === 0) return false;

  return amounts.every((a) => {
    const pctDiff = (Math.abs(a - medianAmount) / medianAmount) * 100;

    return pctDiff <= MAX_AMOUNT_VARIANCE_PCT;
  });
};

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
};

const pickBestDescription = (sorted: Expense[]): string => {
  const counts = new Map<string, number>();
  for (const e of sorted) {
    counts.set(e.description, (counts.get(e.description) ?? 0) + 1);
  }

  let best = sorted[0].description;
  let bestCount = 0;
  for (const [desc, count] of counts) {
    if (count > bestCount) {
      best = desc;
      bestCount = count;
    }
  }

  return best;
};

const pickMostCommonCategoryId = (sorted: Expense[]): string | null => {
  const counts = new Map<string, number>();
  for (const e of sorted) {
    if (!e.category_id) continue;
    counts.set(e.category_id, (counts.get(e.category_id) ?? 0) + 1);
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }

  return best;
};

const scoreDetection = (d: DetectedSubscription): number => {
  const monthlyEquivalent = toMonthlyAmount(d.amount, d.frequency);

  return d.occurrences * monthlyEquivalent;
};

const toMonthlyAmount = (
  amount: number,
  frequency: RecurringExpense['frequency'],
): number => {
  switch (frequency) {
    case 'weekly':
      return amount * WEEKS_PER_MONTH;
    case 'biweekly':
      return amount * BIWEEKLY_PERIODS_PER_MONTH;
    case 'quarterly':
      return amount / 3;
    case 'yearly':
      return amount / 12;
    default:
      return amount;
  }
};
