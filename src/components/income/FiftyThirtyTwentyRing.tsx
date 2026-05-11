import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import {
  useExpensesData,
  useIncomesData,
  useCategoriesData,
  useDataConfig,
} from '@/contexts/DataContext';
import { cn, formatCurrency } from '@/lib/utils';
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
  textClass: string;
};

const BUCKETS: BucketConfig[] = [
  {
    key: 'need',
    target: 0.5,
    color: '#3b82f6',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  {
    key: 'want',
    target: 0.3,
    color: '#f59e0b',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'savings',
    target: 0.2,
    color: '#10b981',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
];

const FiftyThirtyTwentyRing = ({ selectedMonth }: Props) => {
  const { t } = useTranslation();
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const { categories } = useCategoriesData();
  const { defaultCurrency } = useDataConfig();

  const monthExpenses = useMemo(() => {
    return expenses.filter(
      (e: Expense) => format(parseISO(e.date), 'yyyy-MM') === selectedMonth,
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
      (i: Expense) => format(parseISO(i.date), 'yyyy-MM') === selectedMonth,
    );
    for (const income of monthIncomes) {
      if (income.savings_allocation_amount && income.savings_allocation_amount > 0) {
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
    <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">{t('insights.fiftyThirtyTwenty')}</p>
        <p className="text-xs text-muted-foreground">
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
  const actualPct = total > 0 ? actual / total : 0;
  const targetPct = bucket.target;
  const status = getBucketStatus(actualPct, targetPct, bucket.key);

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className={cn('font-medium', bucket.textClass)}>
          {t(`categories.kind.${bucket.key}`)}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {Math.round(actualPct * 100)}% / {Math.round(targetPct * 100)}%
        </span>
      </div>
      <div className="mt-1 h-1.5 bg-muted/40 rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.min(100, actualPct * 100)}%`,
            backgroundColor: bucket.color,
          }}
        />
        <div
          className="absolute top-0 h-full w-px bg-foreground/40"
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

const renderRing = (
  totals: Record<Bucket, number>,
  total: number,
) => {
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
        <div className="absolute inset-3 rounded-full bg-card flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            50 / 30 / 20
          </span>
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
    return diff > 0 ? 'on-target' : 'under';
  }

  return diff > 0 ? 'over' : 'under';
};

const renderStatusLabel = (status: BucketStatus, t: TranslateFunction) => {
  if (status === 'on-target') {
    return (
      <span className="text-income text-xs font-medium">
        {t('insights.onTarget')}
      </span>
    );
  }

  if (status === 'over') {
    return (
      <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">
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
