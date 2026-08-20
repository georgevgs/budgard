import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import SurfaceCard from '@/components/common/SurfaceCard';
import { cn, formatCurrency, formatCurrencyCompact } from '@/lib/utils';
import {
  ChartTooltipShell,
  ChartTooltipRow,
} from '@/components/common/ChartTooltip';
import type { NetWorthPoint } from '@/hooks/useNetWorth';
import { useDateLocale } from '@/hooks/useDateLocale';

const NET_COLOR = 'hsl(var(--primary))';

type Props = {
  series: NetWorthPoint[];
  defaultCurrency: string;
}

const NetWorthChart = ({ series, defaultCurrency }: Props) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  const data = useMemo(
    () =>
      series.map((p) => ({
        ...p,
        label: format(parseISO(p.date), 'MMM d', { locale: dateLocale }),
        fullDate: format(parseISO(p.date), 'PPP', { locale: dateLocale }),
      })),
    [series, dateLocale],
  );

  if (data.length < 2) {
    return null;
  }

  return (
    <SurfaceCard>
      <div className="p-4 space-y-2">
        <p className="text-sm font-medium">{t('networth.chart.title')}</p>
        <div className="w-full">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={data}
              margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="networthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={NET_COLOR} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={NET_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                stroke="currentColor"
                className="text-xs text-muted-foreground"
                tick={{ fill: 'currentColor', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
              />
              <YAxis
                stroke="currentColor"
                className="text-xs text-muted-foreground"
                tick={{ fill: 'currentColor', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  formatCurrencyCompact(Math.abs(value), defaultCurrency)
                }
                width={60}
              />
              <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.3} />
              <Tooltip
                cursor={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
                content={({ active, payload }) =>
                  renderTooltipContent(active, payload, defaultCurrency, t)
                }
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke={NET_COLOR}
                strokeWidth={2}
                fill="url(#networthGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </SurfaceCard>
  );
}

export default NetWorthChart;

// --- Helpers ---

type ChartPoint = NetWorthPoint & { label: string; fullDate: string };

type TooltipEntries = ReadonlyArray<{ payload?: unknown }> | undefined;

type TranslateFunction = (key: string) => string;

const renderTooltipContent = (
  active: boolean | undefined,
  payload: TooltipEntries,
  defaultCurrency: string,
  t: TranslateFunction,
) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as ChartPoint;

  return (
    <ChartTooltipShell title={point.fullDate}>
      <ChartTooltipRow
        label={t('networth.totalLabel')}
        value={formatCurrency(point.total, defaultCurrency)}
        valueClassName={cn('font-semibold', point.total < 0 && 'text-destructive-ink')}
      />
      <ChartTooltipRow
        label={t('networth.assetsLabel')}
        labelClassName="text-muted-foreground"
        value={formatCurrency(point.assets, defaultCurrency)}
      />
      <ChartTooltipRow
        label={t('networth.liabilitiesLabel')}
        labelClassName="text-muted-foreground"
        value={formatCurrency(point.liabilities, defaultCurrency)}
      />
    </ChartTooltipShell>
  );
};
