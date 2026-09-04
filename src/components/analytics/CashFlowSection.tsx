import { Suspense, type ChangeEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataConfig } from '@/contexts/DataContext';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useCashFlowData } from '@/hooks/analytics/useCashFlowData';
import {
  useMoneyFlowData,
  type MoneyFlowData,
} from '@/hooks/analytics/useMoneyFlowData';
import { useCurrentDate } from '@/hooks/useCurrentDate';
import { formatCurrency, cn } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

const MonthlyTrendChart = lazyWithRetry(
  () => import('@/components/analytics/MonthlyTrendChart'),
);
const MoneyFlowPanel = lazyWithRetry(
  () => import('@/components/analytics/MoneyFlowPanel'),
);

type MonthlyDatum = { month: string; fullMonth: string; amount: number };
type YearTotals = ReturnType<typeof useCashFlowData>['yearTotals'];
type View = 'trend' | 'flow';
type TFunc = ReturnType<typeof useTranslation>['t'];

type Props = {
  selectedYear: number;
  isPro: boolean;
  monthlyData: MonthlyDatum[];
  yAxisMax: number | undefined;
  totalSpent: number;
  monthlyAverage: number;
  monthsElapsed: number;
  onMonthClick: (index: number) => void;
};

// One card, one question — "how has my money moved" — answered at whichever
// depth the plan pays for. Free sees a year of spending against budget, the
// exact chart it always has. Pro sees the same chart carrying income and net
// too, plus a second tab for one month's flow by category, rather than a
// separate "Year overview" and a separate "Cash flow" repeating each other.
const CashFlowSection = ({
  selectedYear,
  isPro,
  monthlyData,
  yAxisMax,
  totalSpent,
  monthlyAverage,
  monthsElapsed,
  onMonthClick,
}: Props) => {
  const { t } = useTranslation();
  const { monthlyBudget, defaultCurrency } = useDataConfig();
  const currencySymbol = getCurrencySymbol(defaultCurrency);
  const now = useCurrentDate();
  const [view, setView] = useState<View>('trend');
  const { monthlyData: cashFlowMonthly, yearTotals } =
    useCashFlowData(selectedYear);
  const flow = useMoneyFlowData(now);
  const animatedTotal = useAnimatedNumber(totalSpent);
  const chartData = buildChartData(monthlyData, cashFlowMonthly, isPro);

  return (
    <div className="space-y-3">
      <h2 className="type-heading">{t('cashFlow.title')}</h2>

      <div className="surface-card">
        <div className="p-5 space-y-4">
          {renderStats(
            view,
            isPro,
            animatedTotal,
            monthlyAverage,
            monthsElapsed,
            yearTotals,
            flow,
            selectedYear,
            defaultCurrency,
            t,
          )}

          {renderTabs(isPro, view, setView, t)}

          {renderTrend(
            view,
            chartData,
            monthlyBudget,
            currencySymbol,
            defaultCurrency,
            isPro,
            onMonthClick,
            resolveYAxisMax(isPro, yAxisMax),
            t,
          )}
          {renderFlow(view, flow, defaultCurrency)}
        </div>
      </div>
    </div>
  );
};

export default CashFlowSection;

// ─── Helpers ─────────────────────────────────────────────────────────────────

// yAxisMax is sized for the expense-only free chart (budget vs biggest
// month). Income bars on the Pro chart can run well past that — a paycheck
// is usually bigger than a month of spending — so Pro auto-fits instead of
// inheriting a ceiling that was never sized for it.
const resolveYAxisMax = (
  isPro: boolean,
  yAxisMax: number | undefined,
): number | undefined => {
  if (isPro) {
    return undefined;
  }

  return yAxisMax;
};

const buildChartData = (
  monthlyData: MonthlyDatum[],
  cashFlowMonthly: ReturnType<typeof useCashFlowData>['monthlyData'],
  isPro: boolean,
) => {
  if (!isPro) {
    return monthlyData;
  }

  return monthlyData.map((point, index) => ({
    ...point,
    income: cashFlowMonthly[index]?.income ?? 0,
    net: cashFlowMonthly[index]?.net ?? 0,
  }));
};

const getNetClass = (net: number): string => {
  if (net >= 0) {
    return 'text-income-ink';
  }

  return 'text-destructive-ink';
};

const renderNetSign = (net: number): string => {
  if (net >= 0) {
    return '+';
  }

  return '';
};

const renderStatCell = (
  label: string,
  amount: number,
  currency: string,
  valueClassName: string,
) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p
      className={cn(
        'mt-0.5 text-base font-semibold tabular-nums',
        valueClassName,
      )}
    >
      {formatCurrency(amount, currency)}
    </p>
  </div>
);

const renderStats = (
  view: View,
  isPro: boolean,
  totalSpent: number,
  monthlyAverage: number,
  monthsElapsed: number,
  yearTotals: YearTotals,
  flow: MoneyFlowData,
  selectedYear: number,
  currency: string,
  t: TFunc,
) => {
  if (!isPro) {
    return renderFreeStats(
      totalSpent,
      monthlyAverage,
      monthsElapsed,
      currency,
      t,
    );
  }
  if (view === 'flow') {
    return renderFlowStats(flow, currency, t);
  }

  return renderYearStats(yearTotals, selectedYear, currency, t);
};

// The free plan's whole story: what this year has cost, and the pace it is
// costing at. Unchanged from before the merge — Pro adds detail, it never
// takes this away.
const renderFreeStats = (
  totalSpent: number,
  monthlyAverage: number,
  monthsElapsed: number,
  currency: string,
  t: TFunc,
) => {
  if (monthsElapsed === 0 || totalSpent === 0) {
    return null;
  }

  return (
    <p className="text-sm text-muted-foreground">
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

const renderYearStats = (
  yearTotals: YearTotals,
  selectedYear: number,
  currency: string,
  t: TFunc,
) => (
  <div className="space-y-3">
    <div>
      <p className="text-sm text-muted-foreground">
        {t('cashFlow.yearNet', { year: selectedYear })}
      </p>
      <p
        className={cn(
          'text-3xl font-bold tabular-nums tracking-tight',
          getNetClass(yearTotals.net),
        )}
      >
        {renderNetSign(yearTotals.net)}
        {formatCurrency(yearTotals.net, currency)}
      </p>
    </div>
    <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-2">
      {renderStatCell(
        t('cashFlow.totalIncome'),
        yearTotals.totalIncome,
        currency,
        'text-income-ink',
      )}
      {renderStatCell(
        t('cashFlow.totalExpense'),
        yearTotals.totalExpense,
        currency,
        'text-destructive-ink',
      )}
    </div>
    {renderAvgNet(yearTotals.avgNet, currency, t)}
  </div>
);

const renderAvgNet = (avgNet: number, currency: string, t: TFunc) => {
  if (avgNet === 0) return null;

  return (
    <p className="text-xs text-muted-foreground">
      {t('cashFlow.avgPerMonth', { amount: formatCurrency(avgNet, currency) })}
    </p>
  );
};

const renderFlowStats = (flow: MoneyFlowData, currency: string, t: TFunc) => (
  <div className="space-y-3">
    <div>
      <p className="text-sm text-muted-foreground">
        {t('cashFlow.monthNet', { month: flow.monthLabel })}
      </p>
      <p
        className={cn(
          'text-3xl font-bold tabular-nums tracking-tight',
          getNetClass(flow.savings),
        )}
      >
        {renderNetSign(flow.savings)}
        {formatCurrency(flow.savings, currency)}
      </p>
    </div>
    <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-2">
      {renderStatCell(
        t('income.title'),
        flow.income,
        currency,
        'text-income-ink',
      )}
      {renderStatCell(
        t('expenses.title'),
        flow.totalExpenses,
        currency,
        'text-destructive-ink',
      )}
    </div>
  </div>
);

// Free sees one chart and no tabs to choose from — there is nothing to
// switch between yet, and a control with one destination is not a control.
const renderTabs = (
  isPro: boolean,
  view: View,
  setView: (view: View) => void,
  t: TFunc,
) => {
  if (!isPro) {
    return null;
  }

  return (
    <div role="tablist" className="segmented self-start">
      <button
        type="button"
        role="tab"
        aria-selected={view === 'trend'}
        data-active={view === 'trend'}
        onClick={() => setView('trend')}
        className={SEGMENT}
      >
        {t('cashFlow.viewTrend')}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === 'flow'}
        data-active={view === 'flow'}
        onClick={() => setView('flow')}
        className={SEGMENT}
      >
        {t('cashFlow.viewFlow')}
      </button>
    </div>
  );
};

const SEGMENT =
  'segmented-item cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const renderTrend = (
  view: View,
  data: ReturnType<typeof buildChartData>,
  monthlyBudget: number | null,
  currencySymbol: string,
  currency: string,
  isPro: boolean,
  onMonthClick: (index: number) => void,
  yAxisMax: number | undefined,
  t: TFunc,
) => {
  if (view === 'flow') {
    return null;
  }

  return (
    <div className="border-t border-border/40 pt-4">
      <div className="tile overflow-hidden">
        <div className="p-4">
          <Suspense fallback={<div className="h-[280px]" aria-hidden />}>
            <MonthlyTrendChart
              data={data}
              monthlyBudget={monthlyBudget}
              defaultCurrency={currency}
              currencySymbol={currencySymbol}
              yAxisMax={yAxisMax}
              onMonthClick={onMonthClick}
              showCashFlow={isPro}
            />
          </Suspense>
          {renderMonthDetailSelect(data, onMonthClick, currency, t)}
        </div>
      </div>
    </div>
  );
};

const renderMonthDetailSelect = (
  data: MonthlyDatum[],
  onMonthClick: (index: number) => void,
  currency: string,
  t: TFunc,
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
        className="h-11 w-full rounded-xl border border-border/60 bg-card px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-56 sm:text-sm"
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

const renderFlow = (view: View, flow: MoneyFlowData, currency: string) => {
  if (view !== 'flow') {
    return null;
  }

  return (
    <div className="border-t border-border/40 pt-4">
      <Suspense fallback={<div className="h-[260px]" aria-hidden />}>
        <MoneyFlowPanel flow={flow} currency={currency} />
      </Suspense>
    </div>
  );
};
