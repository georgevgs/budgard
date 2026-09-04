import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import {
  useExpensesData,
  useIncomesData,
  useCategoriesData,
  useDataConfig,
} from '@/contexts/DataContext';
import { formatCurrency } from '@/lib/utils';
import { countsAsSpending, countsInTotals } from '@/lib/spending';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

type Props = {
  selectedMonth: string;
};

type Bucket = 'need' | 'want' | 'savings';

type BucketConfig = {
  key: Bucket;
  target: number; // 0..1
  color: string;
};

// The app's own three colours, doing the app's own three jobs. This used to be
// blue / gold / green — `--info`, `--warning`, `--income` — which is a generic
// chart palette wearing semantic tokens: a "want" is not a warning and a "need"
// is not information, so the hues carried no meaning and the card read as the
// one thing on a white page that had been coloured in from somewhere else.
//
// Each of these is honest about what it is:
//   need     near-black, the unavoidable bulk — the app's ground truth colour
//   want     the accent, because this is the one share you can actually move
//   savings  the money-positive token, for money kept, which is exactly what
//            `--income` means everywhere else in the app
//
// Which also frees `--warning` and `--info` to go back to meaning caution and
// information. They were doubling as bucket colours here while the status
// labels below used the same two hues for a different thing entirely, so a
// gold bar and a gold "over target" sat in one card meaning nothing alike.
const BUCKETS: BucketConfig[] = [
  {
    key: 'need',
    target: 0.5,
    color: 'hsl(var(--foreground))',
  },
  {
    key: 'want',
    target: 0.3,
    color: 'hsl(var(--primary))',
  },
  {
    key: 'savings',
    target: 0.2,
    color: 'hsl(var(--income))',
  },
];

const FiftyThirtyTwentyRing = ({ selectedMonth }: Props) => {
  const { t } = useTranslation();
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const { categories } = useCategoriesData();
  const { defaultCurrency } = useDataConfig();

  // Every arc here is a share of the total, so a single excluded transfer
  // moves all three percentages — including the two it was never filed under.
  const monthExpenses = useMemo(() => {
    return expenses.filter(
      (e: Expense) =>
        countsAsSpending(e) &&
        format(parseISO(e.date), 'yyyy-MM') === selectedMonth,
    );
  }, [expenses, selectedMonth]);

  const totalsByBucket = useMemo(() => {
    const totals: Record<Bucket, number> = { need: 0, want: 0, savings: 0 };
    let unclassifiedTotal = 0;

    for (const expense of monthExpenses) {
      const category = expense.category as Category | undefined;
      const kind = category?.kind;

      if (kind === 'need' || kind === 'want' || kind === 'savings') {
        totals[kind] += expense.amount;
      } else {
        unclassifiedTotal += expense.amount;
      }
    }

    // Add explicit savings allocations from income rows for the same month
    const monthIncomes = incomes.filter(
      (i: Expense) =>
        countsInTotals(i) &&
        format(parseISO(i.date), 'yyyy-MM') === selectedMonth,
    );
    for (const income of monthIncomes) {
      if (
        income.savings_allocation_amount &&
        income.savings_allocation_amount > 0
      ) {
        totals.savings += income.savings_allocation_amount;
      }
    }

    return { totals, unclassifiedTotal };
  }, [monthExpenses, incomes, selectedMonth]);

  const total =
    totalsByBucket.totals.need +
    totalsByBucket.totals.want +
    totalsByBucket.totals.savings;

  if (total === 0 && totalsByBucket.unclassifiedTotal === 0) {
    return null;
  }

  const unclassifiedCount = countUnclassifiedCategories(categories);

  return (
    <div className="surface-card space-y-4 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="type-heading">{t('insights.fiftyThirtyTwenty')}</p>
        <p className="shrink-0 text-xs text-muted-foreground">
          {t('insights.targetSplit')}
        </p>
      </div>

      {renderRing(totalsByBucket.totals, total)}

      <div className="space-y-2.5">
        {BUCKETS.map((bucket) => (
          <BucketRow
            key={bucket.key}
            bucket={bucket}
            actual={totalsByBucket.totals[bucket.key]}
            total={total}
            currency={defaultCurrency}
            t={t}
          />
        ))}
      </div>

      {renderUnclassifiedHint(
        totalsByBucket.unclassifiedTotal,
        unclassifiedCount,
        defaultCurrency,
        t,
      )}
    </div>
  );
};

export default FiftyThirtyTwentyRing;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

type BucketRowProps = {
  bucket: BucketConfig;
  actual: number;
  total: number;
  currency: string;
  t: TranslateFunction;
};

const BucketRow = ({ bucket, actual, total, currency, t }: BucketRowProps) => {
  let actualPct = 0;
  if (total > 0) {
    actualPct = actual / total;
  }
  const targetPct = bucket.target;
  const status = getBucketStatus(actualPct, targetPct, bucket.key);

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: bucket.color }}
            aria-hidden="true"
          />
          {t(`categories.kind.${bucket.key}`)}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {Math.round(actualPct * 100)}% / {Math.round(targetPct * 100)}%
        </span>
      </div>
      <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.min(100, actualPct * 100)}%`,
            backgroundColor: bucket.color,
          }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-background shadow-[0_0_0_0.5px_hsl(var(--foreground)/0.45)]"
          style={{ left: `${targetPct * 100}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="flex items-center justify-between mt-1 text-xs">
        <span className="text-muted-foreground tabular-nums">
          {formatCurrency(actual, currency)}
        </span>
        {renderStatusLabel(status, t)}
      </div>
    </div>
  );
};

const renderRing = (totals: Record<Bucket, number>, total: number) => {
  if (total === 0) return null;

  const stops: string[] = [];
  let cursor = 0;
  for (const bucket of BUCKETS) {
    const slice = (totals[bucket.key] / total) * 360;
    stops.push(`${bucket.color} ${cursor}deg ${cursor + slice}deg`);
    cursor += slice;
  }

  return (
    <div className="flex items-center justify-center py-1">
      <div
        className="h-28 w-28 rounded-full relative"
        style={{
          background: `conic-gradient(${stops.join(', ')})`,
        }}
      >
        <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-tile">
          <span className="tile-label">50 / 30 / 20</span>
        </div>
      </div>
    </div>
  );
};

type BucketStatus = 'on-target' | 'over' | 'under';

const getBucketStatus = (
  actualPct: number,
  targetPct: number,
  bucket: Bucket,
): BucketStatus => {
  const tolerance = 0.05; // ±5pp counts as on target
  const diff = actualPct - targetPct;

  if (Math.abs(diff) <= tolerance) return 'on-target';

  // For savings, more is good. For need/want, less is generally good.
  if (bucket === 'savings') {
    if (diff > 0) {
      return 'on-target';
    }

    return 'under';
  }

  if (diff > 0) {
    return 'over';
  }

  return 'under';
};

const renderStatusLabel = (status: BucketStatus, t: TranslateFunction) => {
  if (status === 'on-target') {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        {t('insights.onTarget')}
      </span>
    );
  }

  if (status === 'over') {
    return (
      <span className="text-xs font-semibold text-foreground">
        {t('insights.overTarget')}
      </span>
    );
  }

  return null;
};

const countUnclassifiedCategories = (categories: Category[]): number => {
  return categories.filter(
    (c) => c.type !== 'income' && (c.kind == null || c.kind === 'income'),
  ).length;
};

const renderUnclassifiedHint = (
  unclassifiedTotal: number,
  unclassifiedCount: number,
  currency: string,
  t: TranslateFunction,
) => {
  if (unclassifiedTotal === 0) return null;

  return (
    <div className="text-xs text-muted-foreground border-t border-border/40 pt-3">
      {t('insights.unclassified', {
        amount: formatCurrency(unclassifiedTotal, currency),
        count: unclassifiedCount,
      })}
    </div>
  );
};
