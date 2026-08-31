import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import CartesianChart from '@/components/charts/CartesianChart';
import type { ChartPoint, Series } from '@/components/charts/chartTypes';
import { formatCurrency } from '@/lib/utils';

type MonthlyDataPoint = {
  month: string;
  fullMonth: string;
  amount: number;
  // Pro only: income and net ride the same chart as extra series rather
  // than a second chart repeating the same twelve months.
  income?: number;
  net?: number;
};

type Props = {
  data: MonthlyDataPoint[];
  monthlyBudget: number | null;
  defaultCurrency: string;
  currencySymbol: string;
  yAxisMax: number | undefined;
  onMonthClick: (monthIndex: number) => void;
  showCashFlow: boolean;
};

const MonthlyTrendChart = ({
  data,
  monthlyBudget,
  defaultCurrency,
  currencySymbol,
  yAxisMax,
  onMonthClick,
  showCashFlow,
}: Props) => {
  const { t } = useTranslation();
  const series = useMemo(
    () => buildSeries(showCashFlow, t),
    [showCashFlow, t],
  );

  return (
    <CartesianChart
      data={data as unknown as ChartPoint[]}
      xKey="month"
      series={series}
      height={280}
      yMax={yAxisMax}
      allowNegative={showCashFlow}
      formatY={(value) => `${Math.round(value)}${currencySymbol}`}
      reference={buildBudgetReference(monthlyBudget, defaultCurrency, t)}
      renderTooltip={(point) => renderTooltip(point, defaultCurrency, t)}
      onPointClick={onMonthClick}
      ariaLabel={buildAriaLabel(data, defaultCurrency, t)}
    />
  );
};

export default memo(MonthlyTrendChart);

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const buildSeries = (showCashFlow: boolean, t: TFunc): Series[] => {
  const series: Series[] = [
    { kind: 'area', key: 'amount', label: t('expenses.title'), color: '--primary' },
  ];
  if (!showCashFlow) {
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

const renderCashFlowTooltip = (point: ChartPoint, currency: string, t: TFunc) => {
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
        <span className="tabular-nums">{formatCurrency(expense, currency)}</span>
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
