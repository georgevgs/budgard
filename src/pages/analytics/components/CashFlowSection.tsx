import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataConfig } from '@/common/contexts/DataContext';
import { useAnimatedNumber } from '@/common/hooks/useAnimatedNumber';
import { useCashFlowData } from '@/pages/analytics/hooks/useCashFlowData';
import type { TranslateFunction } from '@/constants/translate';
import {
  useMoneyFlowData,
  type MoneyFlowData,
} from '@/pages/analytics/hooks/useMoneyFlowData';
import { useCurrentDate } from '@/common/hooks/useCurrentDate';
import { formatCurrency, cn } from '@/constants/utils';
import { getCurrencySymbol } from '@/constants/currencies';
import { lazyWithRetry } from '@/constants/lazyWithRetry';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/ui/select';

const MonthlyTrendChart = lazyWithRetry(async () => {
  const module = await import('@/pages/analytics/components/MonthlyTrendChart');

  return { default: module.MonthlyTrendChart };
});
const MoneyFlowPanel = lazyWithRetry(async () => {
  const module = await import('@/pages/analytics/components/MoneyFlowPanel');

  return { default: module.MoneyFlowPanel };
});

type MonthlyDatum = {
  month: string;
  fullMonth: string;
  monthIndex: number;
  amount: number;
};
type YearTotals = ReturnType<typeof useCashFlowData>['yearTotals'];
type View = 'trend' | 'flow';

type CashFlowSectionProps = {
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
export const CashFlowSection = ({
  selectedYear,
  isPro,
  monthlyData,
  yAxisMax,
  totalSpent,
  monthlyAverage,
  monthsElapsed,
  onMonthClick,
}: CashFlowSectionProps) => {
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
          )}
          {renderFlow(view, flow, defaultCurrency)}
        </div>
      </div>
    </div>
  );
};
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

  return monthlyData.map((point) => ({
    ...point,
    amount: cashFlowExpense(cashFlowMonthly[point.monthIndex]),
    income: cashFlowMonthly[point.monthIndex]?.income ?? 0,
    net: cashFlowMonthly[point.monthIndex]?.net ?? 0,
  }));
};

const cashFlowExpense = (
  month: ReturnType<typeof useCashFlowData>['monthlyData'][number] | undefined,
): number => {
  if (undefined === month) {
    return 0;
  }

  return -month.expense;
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
  t: TranslateFunction,
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
  t: TranslateFunction,
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
  t: TranslateFunction,
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
        'text-foreground',
      )}
    </div>
    {renderAvgNet(yearTotals.avgNet, currency, t)}
  </div>
);

const renderAvgNet = (
  avgNet: number,
  currency: string,
  t: TranslateFunction,
) => {
  if (avgNet === 0) {
    return null;
  }

  return (
    <p className="text-xs text-muted-foreground">
      {t('cashFlow.avgPerMonth', { amount: formatCurrency(avgNet, currency) })}
    </p>
  );
};

const renderFlowStats = (
  flow: MoneyFlowData,
  currency: string,
  t: TranslateFunction,
) => (
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
        'text-foreground',
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
  t: TranslateFunction,
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
) => {
  if (view === 'flow') {
    return null;
  }

  return (
    <div className="border-t border-border/40 pt-4">
      <div className="overflow-hidden">
        <Suspense fallback={<div className="h-[280px]" aria-hidden />}>
          <MonthlyTrendChart
            data={data}
            monthlyBudget={monthlyBudget}
            defaultCurrency={currency}
            currencySymbol={currencySymbol}
            yAxisMax={yAxisMax}
            onMonthClick={onMonthClick}
            shouldShowCashFlow={isPro}
          />
        </Suspense>
      </div>
      <MonthDetailSelect
        data={data}
        currency={currency}
        onMonthClick={onMonthClick}
      />
    </div>
  );
};

const MonthDetailSelect = ({
  data,
  currency,
  onMonthClick,
}: {
  data: MonthlyDatum[];
  currency: string;
  onMonthClick: (index: number) => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border/40 pt-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-medium text-muted-foreground">
        {t('analytics.viewMonthDetails')}
      </p>
      <Select
        value=""
        onValueChange={(value) => onMonthClick(Number.parseInt(value, 10))}
      >
        <SelectTrigger
          className="h-11 rounded-full border-0 bg-tile px-4 shadow-[inset_0_0_0_1px_hsl(var(--tile-ring))] sm:w-56"
          aria-label={t('analytics.viewMonthDetails')}
        >
          <SelectValue placeholder={t('analytics.chooseMonth')} />
        </SelectTrigger>
        <SelectContent>
          {data.map((point) => (
            <SelectItem
              key={point.fullMonth}
              value={point.monthIndex.toString()}
            >
              {point.fullMonth} — {formatCurrency(point.amount, currency)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
