import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import CartesianChart from '@/components/charts/CartesianChart';
import type { ChartPoint, Series } from '@/components/charts/chartTypes';
import { formatCurrency } from '@/lib/utils';

type MonthlyDataPoint = {
  month: string;
  fullMonth: string;
  amount: number;
};

type Props = {
  data: MonthlyDataPoint[];
  monthlyBudget: number | null;
  defaultCurrency: string;
  currencySymbol: string;
  yAxisMax: number | undefined;
  onMonthClick: (monthIndex: number) => void;
};

const SERIES: Series[] = [
  { kind: 'area', key: 'amount', label: 'amount', color: '--primary' },
];

const MonthlyTrendChart = ({
  data,
  monthlyBudget,
  defaultCurrency,
  currencySymbol,
  yAxisMax,
  onMonthClick,
}: Props) => {
  const { t } = useTranslation();

  return (
    <CartesianChart
      data={data as unknown as ChartPoint[]}
      xKey="month"
      series={SERIES}
      height={280}
      yMax={yAxisMax}
      formatY={(value) => `${Math.round(value)}${currencySymbol}`}
      reference={buildBudgetReference(monthlyBudget, defaultCurrency, t)}
      renderTooltip={(point) => renderTooltip(point, defaultCurrency)}
      onPointClick={onMonthClick}
      ariaLabel={buildAriaLabel(data, defaultCurrency, t)}
    />
  );
};

export default memo(MonthlyTrendChart);

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderTooltip = (point: ChartPoint, currency: string) => (
  <>
    <p className="font-medium text-foreground">{String(point.fullMonth)}</p>
    <p className="mt-1 text-sm font-semibold tabular-nums">
      {formatCurrency(Number(point.amount ?? 0), currency)}
    </p>
  </>
);

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
