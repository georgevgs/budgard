import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CartesianChart } from '@/common/components/charts/CartesianChart';
import type { ChartPoint, Series } from '@/common/components/charts/chartTypes';
import { formatCurrency } from '@/constants/utils';

type MonthlyDataPoint = {
  month: string;
  fullMonth: string;
  amount: number;
  // Pro only: income and net ride the same chart as extra series rather
  // than a second chart repeating the same twelve months.
  income?: number;
  net?: number;
};

type MonthlyTrendChartProps = {
  data: MonthlyDataPoint[];
  monthlyBudget: number | null;
  defaultCurrency: string;
  currencySymbol: string;
  yAxisMax: number | undefined;
  onMonthClick: (monthIndex: number) => void;
  shouldShowCashFlow: boolean;
};

const MonthlyTrendChartComponent = ({
  data,
  monthlyBudget,
  defaultCurrency,
  currencySymbol,
  yAxisMax,
  onMonthClick,
  shouldShowCashFlow,
}: MonthlyTrendChartProps) => {
  const { t } = useTranslation();
  const series = useMemo(() => buildSeries(shouldShowCashFlow, t), [shouldShowCashFlow, t]);

  return (
    <CartesianChart
      data={data as unknown as ChartPoint[]}
      xKey="month"
      series={series}
      height={280}
      yMax={yAxisMax}
      shouldAllowNegative={shouldShowCashFlow}
      formatY={(value) => `${Math.round(value)}${currencySymbol}`}
      reference={buildBudgetReference(monthlyBudget, defaultCurrency, t)}
      renderTooltip={(point) => renderTooltip(point, defaultCurrency, t)}
      onPointClick={onMonthClick}
      ariaLabel={buildAriaLabel(data, defaultCurrency, t)}
    />
  );
};

// Memoised: the parent re-renders on every data mutation, this subtree does not.
export const MonthlyTrendChart = memo(MonthlyTrendChartComponent);
// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const buildSeries = (shouldShowCashFlow: boolean, t: TFunc): Series[] => {
  const series: Series[] = [
    {
      kind: 'area',
      key: 'amount',
      label: t('expenses.title'),
      color: '--primary',
    },
  ];
  if (!shouldShowCashFlow) {
    return series;
  }

  return [
    ...series,
    { kind: 'bar', key: 'income', label: t('income.title'), color: '--income' },
    {
      kind: 'line',
      key: 'net',
      label: t('income.netCashFlow'),
      color: '--foreground',
    },
  ];
};

const renderTooltip = (point: ChartPoint, currency: string, t: TFunc) => {
  if (point.income === undefined) {
    return (
      <>
        <p className="font-medium text-foreground">{String(point.fullMonth)}</p>
        <p className="mt-1 text-sm font-semibold tabular-nums">
          {formatCurrency(Number(point.amount ?? 0), currency)}
        </p>
      </>
    );
  }

  return renderCashFlowTooltip(point, currency, t);
};

const renderCashFlowTooltip = (
  point: ChartPoint,
  currency: string,
  t: TFunc,
) => {
  const income = Number(point.income ?? 0);
  const expense = Number(point.amount ?? 0);
  const net = Number(point.net ?? 0);

  return (
    <div className="space-y-1">
      <p className="font-medium text-foreground">{String(point.fullMonth)}</p>
      <p className="flex items-center justify-between gap-3 text-xs">
        <span className="text-income-ink">{t('income.title')}</span>
        <span className="tabular-nums">{formatCurrency(income, currency)}</span>
      </p>
      <p className="flex items-center justify-between gap-3 text-xs">
        <span className="text-destructive-ink">{t('expenses.title')}</span>
        <span className="tabular-nums">
          {formatCurrency(expense, currency)}
        </span>
      </p>
      <p className="flex items-center justify-between gap-3 border-t border-border/40 pt-1 text-xs font-semibold">
        <span>{t('income.netCashFlow')}</span>
        <span className="tabular-nums">{formatCurrency(net, currency)}</span>
      </p>
    </div>
  );
};

const buildBudgetReference = (
  monthlyBudget: number | null,
  currency: string,
  t: TFunc,
) => {
  if (!monthlyBudget) {
    return undefined;
  }

  return {
    value: monthlyBudget,
    color: '--warning',
    label: t('analytics.budgetLabel', {
      amount: formatCurrency(monthlyBudget, currency),
    }),
  };
};

// The chart is a picture to a sighted user and a sentence to everyone else.
// Range plus span is what a summary needs — reading twelve values aloud is
// noise, not information.
const buildAriaLabel = (
  data: MonthlyDataPoint[],
  currency: string,
  t: TFunc,
): string => {
  if (data.length === 0) {
    return t('analytics.monthlyTrend');
  }

  const amounts = data.map((point) => point.amount);

  return t('analytics.trendSummary', {
    count: data.length,
    first: data[0].fullMonth,
    last: data[data.length - 1].fullMonth,
    low: formatCurrency(Math.min(...amounts), currency),
    high: formatCurrency(Math.max(...amounts), currency),
  });
};
