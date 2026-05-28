import { format, startOfWeek, subDays } from 'date-fns';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

// "This week" is the last completed Mon–Sun window before `now`. The recap is
// surfaced on Mondays, so on a Monday the window is the week that just ended
// yesterday. Baseline is the 90 days immediately preceding that window. We
// compare each category's current week against its average week over that
// baseline.
const WEEK_DAYS = 7;
const BASELINE_DAYS = 90;
const BASELINE_WEEKS = BASELINE_DAYS / WEEK_DAYS;

// A category must have enough baseline signal to compare against — otherwise
// ratios explode on noise (one €40 expense 80 days ago vs €20 this week
// shouldn't read as "2× normal").
const MIN_BASELINE_TRANSACTIONS = 3;
const MIN_BASELINE_WEEKLY_AVG = 5;

// Ratio thresholds for flagging as an anomaly.
export const UP_RATIO_THRESHOLD = 1.5;
export const DOWN_RATIO_THRESHOLD = 0.5;

const MAX_ANOMALIES = 3;

export type WeeklyAnomaly = {
  categoryId: string;
  categoryName: string;
  color: string | null;
  icon: string | null;
  thisWeekAmount: number;
  baselineWeeklyAverage: number;
  ratio: number;
  direction: 'up' | 'down';
};

export type WeeklyRecap = {
  windowStart: string;
  windowEnd: string;
  weekTotal: number;
  weekCount: number;
  baselineWeeklyAverage: number;
  totalRatio: number | null;
  anomalies: WeeklyAnomaly[];
};

type BuildArgs = {
  now: Date;
  expenses: Expense[];
  categories: Category[];
};

export const buildWeeklyRecap = ({
  now,
  expenses,
  categories,
}: BuildArgs): WeeklyRecap | null => {
  // Window = last completed Mon–Sun. startOfWeek({ weekStartsOn: 1 }) gives
  // the Monday at the start of *this* week; the prior Sunday is one day
  // before that, and the prior Monday seven days before that.
  const thisMonday = startOfWeek(now, { weekStartsOn: 1 });
  const windowEndDate = subDays(thisMonday, 1);
  const windowStartDate = subDays(windowEndDate, WEEK_DAYS - 1);
  const baselineStartDate = subDays(windowStartDate, BASELINE_DAYS);

  const windowStart = format(windowStartDate, 'yyyy-MM-dd');
  const windowEnd = format(windowEndDate, 'yyyy-MM-dd');
  const baselineStart = format(baselineStartDate, 'yyyy-MM-dd');

  const spendable = expenses.filter(isSpendable);

  const weekExpenses = spendable.filter(
    (e) => e.date >= windowStart && e.date <= windowEnd,
  );

  if (weekExpenses.length === 0) return null;

  const baselineExpenses = spendable.filter(
    (e) => e.date >= baselineStart && e.date < windowStart,
  );

  const weekTotal = sumAmount(weekExpenses);
  const baselineTotal = sumAmount(baselineExpenses);
  const baselineWeeklyAverage = baselineTotal / BASELINE_WEEKS;

  let totalRatio: number | null = null;
  if (baselineWeeklyAverage > 0) {
    totalRatio = weekTotal / baselineWeeklyAverage;
  }

  const anomalies = computeAnomalies(weekExpenses, baselineExpenses, categories);

  return {
    windowStart,
    windowEnd,
    weekTotal,
    weekCount: weekExpenses.length,
    baselineWeeklyAverage,
    totalRatio,
    anomalies,
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isSpendable = (e: Expense): boolean => e.type !== 'debt_payment';

const sumAmount = (rows: Expense[]): number =>
  rows.reduce((sum, e) => sum + e.amount, 0);

type CategoryBucket = {
  total: number;
  count: number;
};

const bucketByCategory = (rows: Expense[]): Map<string, CategoryBucket> => {
  const buckets = new Map<string, CategoryBucket>();

  for (const row of rows) {
    if (!row.category_id) continue;

    const slot = buckets.get(row.category_id);
    if (!slot) {
      buckets.set(row.category_id, { total: row.amount, count: 1 });
      continue;
    }

    slot.total += row.amount;
    slot.count += 1;
  }

  return buckets;
};

const computeAnomalies = (
  weekRows: Expense[],
  baselineRows: Expense[],
  categories: Category[],
): WeeklyAnomaly[] => {
  const weekByCat = bucketByCategory(weekRows);
  const baselineByCat = bucketByCategory(baselineRows);
  const catById = new Map(categories.map((c) => [c.id, c]));

  const anomalies: WeeklyAnomaly[] = [];

  for (const [categoryId, baseline] of baselineByCat) {
    const category = catById.get(categoryId);
    if (!category) continue;

    const baselineWeeklyAvg = baseline.total / BASELINE_WEEKS;
    if (baselineWeeklyAvg < MIN_BASELINE_WEEKLY_AVG) continue;
    if (baseline.count < MIN_BASELINE_TRANSACTIONS) continue;

    const thisWeek = weekByCat.get(categoryId)?.total ?? 0;
    const ratio = thisWeek / baselineWeeklyAvg;

    const direction = classifyDirection(ratio);
    if (direction === null) continue;

    anomalies.push({
      categoryId,
      categoryName: category.name,
      color: category.color,
      icon: category.icon,
      thisWeekAmount: thisWeek,
      baselineWeeklyAverage: baselineWeeklyAvg,
      ratio,
      direction,
    });
  }

  anomalies.sort(compareAnomalies);

  return anomalies.slice(0, MAX_ANOMALIES);
};

const classifyDirection = (ratio: number): 'up' | 'down' | null => {
  if (ratio >= UP_RATIO_THRESHOLD) return 'up';
  if (ratio > 0 && ratio <= DOWN_RATIO_THRESHOLD) return 'down';

  return null;
};

// Up-anomalies rank before down-anomalies (more actionable), then by how
// far each ratio deviates from 1 (1.0 means "exactly normal").
const compareAnomalies = (a: WeeklyAnomaly, b: WeeklyAnomaly): number => {
  if (a.direction !== b.direction) {
    if (a.direction === 'up') {
      return -1;
    }

    return 1;
  }

  return Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1);
};
