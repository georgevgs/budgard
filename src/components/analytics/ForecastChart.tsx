import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import CartesianChart from '@/components/charts/CartesianChart';
import type { ChartPoint, Series } from '@/components/charts/chartTypes';
import { ChartTooltipRow } from '@/components/common/ChartTooltip';
import { cn, formatCurrency } from '@/lib/utils';
import type { ProjectionMonth } from '@/lib/forecast';

type Props = {
  data: ProjectionMonth[];
  currencySymbol: string;
  currency: string;
  // Drawn solid against the dashed flow lines: the balance is the one series
  // here anchored to something the user actually has, rather than modelled
  // from an average.
  hasBalance: boolean;
};

const ForecastChart = ({
  data,
  currencySymbol,
  currency,
  hasBalance,
}: Props) => {
  const { t } = useTranslation();

  // The flow lines are dashed: those values are modelled, not measured, and a
  // solid line would claim a certainty the forecast does not have. The balance
  // is drawn solid because it starts from a figure the user actually holds.
  const series = useMemo<Series[]>(
    () => [
      {
        kind: 'line',
        key: 'projectedIncome',
        label: t('analytics.forecast.projectedIncome'),
        color: '--income',
        dashed: true,
      },
      {
        kind: 'line',
        key: 'projectedExpenses',
        label: t('analytics.forecast.projectedSpending'),
        color: '--primary',
        dashed: true,
      },
      ...balanceSeries(hasBalance, t),
    ],
    [t, hasBalance],
  );

  return (
    <CartesianChart
      data={data as unknown as ChartPoint[]}
      xKey="label"
      series={series}
      height={288}
      showLegend
      allowNegative={hasBalance}
      reference={buildZeroLine(hasBalance, t)}
      formatY={(value) => `${Math.round(value)}${currencySymbol}`}
      renderTooltip={(point) => renderTooltip(point, currency, t)}
      ariaLabel={buildAriaLabel(data, currency, t)}
    />
  );
};

export default memo(ForecastChart);

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const balanceSeries = (hasBalance: boolean, t: TFunc): Series[] => {
  if (!hasBalance) {
    return [];
  }

  return [
    {
      kind: 'line',
      key: 'projectedBalance',
      label: t('analytics.forecast.projectedBalance'),
      color: '--foreground',
    },
  ];
};

// Only worth drawing when there is a balance that could cross it. Zero on a
// chart of pure flows is just the bottom of the axis.
const buildZeroLine = (hasBalance: boolean, t: TFunc) => {
  if (!hasBalance) {
    return undefined;
  }

  return {
    value: 0,
    color: '--muted-foreground',
    label: t('analytics.forecast.empty'),
  };
};

const renderTooltip = (point: ChartPoint, currency: string, t: TFunc) => {
  const net = Number(point.projectedNet ?? 0);

  return (
    <div className="space-y-1.5">
      <p className="font-medium text-foreground">{String(point.label)}</p>
      <ChartTooltipRow
        label={t('analytics.forecast.projectedIncome')}
        labelClassName="text-income-ink"
        value={`+${formatCurrency(Number(point.projectedIncome ?? 0), currency)}`}
      />
      <ChartTooltipRow
        label={t('analytics.forecast.projectedSpending')}
        labelClassName="text-destructive-ink"
        value={`-${formatCurrency(Number(point.projectedExpenses ?? 0), currency)}`}
      />
      {renderBalanceRow(point, currency, t)}
      <ChartTooltipRow
        label={t('analytics.forecast.projectedNet')}
        labelClassName="font-medium"
        value={`${netSign(net)}${formatCurrency(net, currency)}`}
        valueClassName={cn('font-semibold', netClass(net))}
        separated
      />
    </div>
  );
};

const renderBalanceRow = (point: ChartPoint, currency: string, t: TFunc) => {
  if (typeof point.projectedBalance !== 'number') {
    return null;
  }

  return (
    <ChartTooltipRow
      label={t('analytics.forecast.projectedBalance')}
      labelClassName="font-medium"
      value={formatCurrency(point.projectedBalance, currency)}
      valueClassName={cn('font-semibold', netClass(point.projectedBalance))}
    />
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
  data: ProjectionMonth[],
  currency: string,
  t: TFunc,
): string => {
  if (data.length === 0) {
    return t('analytics.forecast.title');
  }

  const last = data[data.length - 1];

  return t('analytics.forecastSummary', {
    count: data.length,
    last: last.label,
    net: formatCurrency(last.projectedNet, currency),
  });
};
