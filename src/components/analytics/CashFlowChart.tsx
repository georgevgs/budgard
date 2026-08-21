import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import CartesianChart from '@/components/charts/CartesianChart';
import type { ChartPoint as Point, Series } from '@/components/charts/chartTypes';
import { ChartTooltipRow } from '@/components/common/ChartTooltip';
import { cn, formatCurrency } from '@/lib/utils';

type CashFlowPoint = {
  month: string;
  fullMonth: string;
  income: number;
  expense: number;
  net: number;
};

type Props = {
  data: CashFlowPoint[];
  currencySymbol: string;
  currency: string;
};

const CashFlowChart = ({ data, currencySymbol, currency }: Props) => {
  const { t } = useTranslation();

  // Income rises from zero and spending falls below it, with the net running
  // through as a line — so a month that earned more than it spent reads at a
  // glance from which side of the axis is taller.
  const series = useMemo<Series[]>(
    () => [
      { kind: 'bar', key: 'income', label: t('income.title'), color: '--income' },
      { kind: 'bar', key: 'expense', label: t('expenses.title'), color: '--primary' },
      {
        kind: 'line',
        key: 'net',
        label: t('income.netCashFlow'),
        color: '--foreground',
        smooth: false,
      },
    ],
    [t],
  );

  return (
    <CartesianChart
      data={data as unknown as Point[]}
      xKey="month"
      series={series}
      height={288}
      allowNegative
      showLegend
      formatY={(value) => `${Math.abs(Math.round(value))}${currencySymbol}`}
      renderTooltip={(point) => renderTooltip(point, currency, t)}
      ariaLabel={buildAriaLabel(data, currency, t)}
    />
  );
};

export default memo(CashFlowChart);

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderTooltip = (point: Point, currency: string, t: TFunc) => {
  const income = Number(point.income ?? 0);
  const expense = Number(point.expense ?? 0);
  const net = Number(point.net ?? 0);

  return (
    <div className="space-y-1.5">
      <p className="font-medium text-foreground">{String(point.fullMonth)}</p>
      <ChartTooltipRow
        label={t('income.title')}
        labelClassName="text-income-ink"
        value={`+${formatCurrency(income, currency)}`}
      />
      <ChartTooltipRow
        label={t('expenses.title')}
        labelClassName="text-destructive-ink"
        value={`-${formatCurrency(Math.abs(expense), currency)}`}
      />
      <ChartTooltipRow
        label={t('income.netCashFlow')}
        labelClassName="font-medium"
        value={`${netSign(net)}${formatCurrency(net, currency)}`}
        valueClassName={cn('font-semibold', netClass(net))}
        separated
      />
    </div>
  );
};

const netClass = (net: number): string => {
  if (net >= 0) {
    return 'text-income-ink';
  }

  return 'text-destructive-ink';
};

const netSign = (net: number): string => {
  if (net >= 0) {
    return '+';
  }

  return '';
};

const buildAriaLabel = (
  data: CashFlowPoint[],
  currency: string,
  t: TFunc,
): string => {
  if (data.length === 0) {
    return t('income.netCashFlow');
  }

  const totalNet = data.reduce((sum, point) => sum + point.net, 0);

  return t('analytics.cashFlowSummary', {
    count: data.length,
    first: data[0].fullMonth,
    last: data[data.length - 1].fullMonth,
    net: formatCurrency(totalNet, currency),
  });
};
