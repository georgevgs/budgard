import { Suspense, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataConfig } from '@/contexts/DataContext';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { formatCurrency } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

// Lazy-load the chart so the Recharts chunk doesn't gate the rest of the
// view's render. The placeholder reserves the same vertical space (~280px)
// to avoid layout shift when the chunk resolves.
const MonthlyTrendChart = lazyWithRetry(
  () => import('@/components/analytics/MonthlyTrendChart'),
);

type MonthlyDatum = {
  month: string;
  fullMonth: string;
  amount: number;
};

type Props = {
  monthlyData: MonthlyDatum[];
  yAxisMax: number | undefined;
  totalSpent: number;
  monthlyAverage: number;
  monthsElapsed: number;
  onMonthClick: (index: number) => void;
};

const YearOverviewSection = ({
  monthlyData,
  yAxisMax,
  totalSpent,
  monthlyAverage,
  monthsElapsed,
  onMonthClick,
}: Props) => {
  const { t } = useTranslation();
  const { monthlyBudget, defaultCurrency } = useDataConfig();
  const animatedYearTotal = useAnimatedNumber(totalSpent);
  const currencySymbol = getCurrencySymbol(defaultCurrency);

  return (
    <div className="space-y-3">
      <h2 className="type-heading">
        {t('analytics.yearOverview')}
      </h2>

      {renderYearSummary(
        animatedYearTotal,
        monthlyAverage,
        monthsElapsed,
        t,
        defaultCurrency,
      )}

      <div className="tile overflow-hidden">
        <div className="p-4">
          <div className="w-full" aria-hidden="true">
            <Suspense fallback={<div className="h-[280px]" aria-hidden />}>
              <MonthlyTrendChart
                data={monthlyData}
                monthlyBudget={monthlyBudget}
                defaultCurrency={defaultCurrency}
                currencySymbol={currencySymbol}
                yAxisMax={yAxisMax}
                onMonthClick={onMonthClick}
              />
            </Suspense>
          </div>
          {renderMonthDetailSelect(
            monthlyData,
            onMonthClick,
            t,
            defaultCurrency,
          )}
        </div>
      </div>
    </div>
  );
};

export default YearOverviewSection;

// ─── Helper render functions ──────────────────────────────────────────────────

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderYearSummary = (
  totalSpent: number,
  monthlyAverage: number,
  monthsElapsed: number,
  t: TFunc,
  currency: string,
) => {
  if (monthsElapsed === 0 || totalSpent === 0) return null;

  return (
    <p className="text-sm text-muted-foreground -mt-1">
      <span className="font-semibold tabular-nums text-foreground">
        {formatCurrency(totalSpent, currency)}
      </span>
      <span className="mx-2">·</span>
      <span>
        {t('analytics.avgPerMonth', {
          amount: formatCurrency(monthlyAverage, currency),
        })}
      </span>
    </p>
  );
};

const renderMonthDetailSelect = (
  data: MonthlyDatum[],
  onMonthClick: (index: number) => void,
  t: TFunc,
  currency: string,
) => {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const monthIndex = Number(event.target.value);
    if (!Number.isInteger(monthIndex)) return;

    onMonthClick(monthIndex);
  };

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border/40 pt-3 sm:flex-row sm:items-center sm:justify-between">
      <label
        htmlFor="analytics-month-details"
        className="text-xs font-medium text-muted-foreground"
      >
        {t('analytics.viewMonthDetails')}
      </label>
      <select
        id="analytics-month-details"
        value=""
        onChange={handleChange}
        className="h-11 w-full rounded-xl border border-border/60 bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
      >
        <option value="" disabled>
          {t('analytics.chooseMonth')}
        </option>
        {data.map((point, index) => (
          <option key={point.fullMonth} value={index}>
            {point.fullMonth} — {formatCurrency(point.amount, currency)}
          </option>
        ))}
      </select>
    </div>
  );
};
