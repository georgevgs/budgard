import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import SurfaceCard from '@/components/common/SurfaceCard';
import CartesianChart from '@/components/charts/CartesianChart';
import type { ChartPoint, Series } from '@/components/charts/chartTypes';
import { ChartTooltipRow } from '@/components/common/ChartTooltip';
import { cn, formatCurrency, formatCurrencyCompact } from '@/lib/utils';
import type { NetWorthPoint } from '@/hooks/useNetWorth';
import { useDateLocale } from '@/hooks/useDateLocale';

type Props = {
  series: NetWorthPoint[];
  defaultCurrency: string;
  /** True when any live debt is folded into the line as a flat constant. */
  hasDebtConstant?: boolean;
};

const SERIES: Series[] = [
  { kind: 'area', key: 'total', label: 'total', color: '--primary' },
];

const NetWorthChart = ({
  series,
  defaultCurrency,
  hasDebtConstant = false,
}: Props) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  const data = useMemo(
    () =>
      series.map((point) => ({
        ...point,
        label: format(parseISO(point.date), 'MMM d', { locale: dateLocale }),
        fullDate: format(parseISO(point.date), 'PPP', { locale: dateLocale }),
      })),
    [series, dateLocale],
  );

  // One snapshot is a number, not a trend — the KPI above already shows it.
  if (data.length < 2) {
    return null;
  }

  return (
    <SurfaceCard>
      <div className="p-4 space-y-2">
        <p className="text-sm font-medium">{t('networth.chart.title')}</p>
        <CartesianChart
          data={data as unknown as ChartPoint[]}
          xKey="label"
          series={SERIES}
          height={220}
          allowNegative
          formatY={(value) =>
            formatCurrencyCompact(Math.abs(value), defaultCurrency)
          }
          reference={{ value: 0, color: '--muted-foreground' }}
          renderTooltip={(point) => renderTooltip(point, defaultCurrency, t)}
          ariaLabel={buildAriaLabel(data, defaultCurrency, t)}
        />
        {renderDebtCaveat(hasDebtConstant, t)}
      </div>
    </SurfaceCard>
  );
};

export default NetWorthChart;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

// Per-day debt history is not tracked, so today's debt total is subtracted
// from every historical point to keep the last point aligned with the header.
// That makes the liability component a constant, which means the shape of the
// line is the shape of the assets — worth saying rather than leaving the
// reader to infer a debt trend that was never drawn.
const renderDebtCaveat = (hasDebtConstant: boolean, t: TFunc) => {
  if (!hasDebtConstant) return null;

  return (
    <p className="text-xs text-muted-foreground">
      {t('networth.chart.debtConstantNote')}
    </p>
  );
};

const renderTooltip = (point: ChartPoint, currency: string, t: TFunc) => {
  const total = Number(point.total ?? 0);

  return (
    <div className="space-y-1.5">
      <p className="font-medium text-foreground">{String(point.fullDate)}</p>
      <ChartTooltipRow
        label={t('networth.totalLabel')}
        value={formatCurrency(total, currency)}
        valueClassName={cn('font-semibold', negativeClass(total))}
      />
      <ChartTooltipRow
        label={t('networth.assetsLabel')}
        labelClassName="text-muted-foreground"
        value={formatCurrency(Number(point.assets ?? 0), currency)}
      />
      <ChartTooltipRow
        label={t('networth.liabilitiesLabel')}
        labelClassName="text-muted-foreground"
        value={formatCurrency(Number(point.liabilities ?? 0), currency)}
      />
    </div>
  );
};

const negativeClass = (total: number): string => {
  if (total < 0) {
    return 'text-destructive-ink';
  }

  return '';
};

const buildAriaLabel = (
  data: { fullDate: string; total: number }[],
  currency: string,
  t: TFunc,
): string => {
  const first = data[0];
  const last = data[data.length - 1];

  return t('networth.chartSummary', {
    first: first.fullDate,
    last: last.fullDate,
    from: formatCurrency(first.total, currency),
    to: formatCurrency(last.total, currency),
  });
};
