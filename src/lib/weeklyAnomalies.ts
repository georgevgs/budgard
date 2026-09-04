import {
  differenceInCalendarDays,
  format,
  parseISO,
  startOfWeek,
  subDays,
} from 'date-fns';
import { buildBaseline, compareToBaseline } from '@/lib/baseline';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import { countsAsSpending } from '@/lib/spending';

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

const MAX_ANOMALIES = 3;

export type WeeklyAnomaly = {
  categoryId: string;
  categoryName: string;
  color: string | null;
  icon: string | null;
  thisWeekAmount: number;
  // The typical week for this category, as a median — not a mean.
  baselineWeeklyAverage: number;
  ratio: number;
  direction: 'up' | 'down';
  // How far from this category's own normal, in spreads. Drives the ordering.
  deviations: number;
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

  const anomalies = computeAnomalies(
    weekExpenses,
    baselineExpenses,
    categories,
    baselineStartDate,
  );

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

// Was `type !== 'debt_payment'` — now the same decision the rest of the app
// makes in one place, including rows the user marked as not spending.
const isSpendable = (e: Expense): boolean => countsAsSpending(e);

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

// One number per week per category over the baseline window, which is what
// the baseline model needs — a single 90-day total cannot say whether the
// weeks behind it were steady or wildly uneven, and that difference is
// exactly what decides whether this week is worth mentioning.
const weeklyTotalsByCategory = (
  rows: Expense[],
  windowStart: Date,
): Map<string, number[]> => {
  const byCategory = new Map<string, number[]>();

  for (const row of rows) {
    if (!row.category_id) {
      continue;
    }
    // Calendar days, not milliseconds: a week that spans a clock change is
    // 167 or 169 hours long, and dividing raw milliseconds filed a boundary
    // date into the neighbouring week — enough to move a category in or out
    // of an anomaly callout.
    const weekIndex = Math.floor(
      differenceInCalendarDays(parseISO(row.date), windowStart) / WEEK_DAYS,
    );
    if (weekIndex < 0) {
      continue;
    }

    const weeks = byCategory.get(row.category_id) ?? [];
    weeks[weekIndex] = (weeks[weekIndex] ?? 0) + row.amount;
    byCategory.set(row.category_id, weeks);
  }

  // A week the category was never touched is a real zero, not a gap: "you
  // usually spend nothing here" is information the baseline needs.
  for (const [categoryId, weeks] of byCategory) {
    const filled = Array.from(
      { length: BASELINE_WEEKS },
      (_, index) => weeks[index] ?? 0,
    );
    byCategory.set(categoryId, filled);
  }

  return byCategory;
};

const computeAnomalies = (
  weekRows: Expense[],
  baselineRows: Expense[],
  categories: Category[],
  baselineStart: Date,
): WeeklyAnomaly[] => {
  const weekByCat = bucketByCategory(weekRows);
  const baselineByCat = bucketByCategory(baselineRows);
  const weeklyByCat = weeklyTotalsByCategory(baselineRows, baselineStart);
  const catById = new Map(categories.map((c) => [c.id, c]));

  const anomalies: WeeklyAnomaly[] = [];

  for (const [categoryId, baseline] of baselineByCat) {
    const category = catById.get(categoryId);
    if (!category) continue;

    const baselineWeeklyAvg = baseline.total / BASELINE_WEEKS;
    if (baselineWeeklyAvg < MIN_BASELINE_WEEKLY_AVG) continue;
    if (baseline.count < MIN_BASELINE_TRANSACTIONS) continue;

    const thisWeek = weekByCat.get(categoryId)?.total ?? 0;
    const model = buildBaseline(weeklyByCat.get(categoryId) ?? []);
    const comparison = compareToBaseline(thisWeek, model);

    // The model decides whether this is worth saying at all. A category whose
    // weeks swing wildly has to move a long way before it counts as unusual;
    // a steady one is flagged by a much smaller change. A flat ratio
    // threshold treated both the same and cried wolf on the lumpy ones.
    const direction = directionFor(comparison.verdict);
    if (direction === null) continue;

    anomalies.push({
      categoryId,
      categoryName: category.name,
      color: category.color,
      icon: category.icon,
      thisWeekAmount: thisWeek,
      // Reported against the typical week rather than the mean, so the copy
      // matches the reason the week was flagged.
      baselineWeeklyAverage: model.median,
      ratio: safeRatio(thisWeek, model.median),
      direction,
      deviations: comparison.deviations,
    });
  }

  anomalies.sort(compareAnomalies);

  return anomalies.slice(0, MAX_ANOMALIES);
};

const directionFor = (
  verdict: ReturnType<typeof compareToBaseline>['verdict'],
): 'up' | 'down' | null => {
  if (verdict === 'higher') {
    return 'up';
  }
  if (verdict === 'lower') {
    return 'down';
  }

  return null;
};

// A typical week of zero would divide by nothing; the ratio is only used for
// wording, so 1 ("about usual") is the honest fallback.
const safeRatio = (thisWeek: number, median: number): number => {
  if (median <= 0) {
    return 1;
  }

  return thisWeek / median;
};

// Up-anomalies rank before down-anomalies (more actionable), then by how far
// each sits from that category's own normal.
const compareAnomalies = (a: WeeklyAnomaly, b: WeeklyAnomaly): number => {
  if (a.direction !== b.direction) {
    if (a.direction === 'up') {
      return -1;
    }

    return 1;
  }

  return Math.abs(b.deviations) - Math.abs(a.deviations);
};
