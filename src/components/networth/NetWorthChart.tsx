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
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';
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
  const currencySymbol = getCurrencySymbol(defaultCurrency);

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
    <Card>
      <CardContent className="p-4 space-y-2">
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
                  `${Math.abs(value).toLocaleString()}${currencySymbol}`
                }
                width={60}
              />
              <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.3} />
              <Tooltip
                cursor={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const point = payload[0].payload as (typeof data)[number];

                  return (
                    <div className="rounded-xl bg-popover border border-border/40 shadow-md p-3 text-xs space-y-1.5">
                      <p className="font-medium text-foreground">
                        {point.fullDate}
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <span>{t('networth.totalLabel')}</span>
                        <span
                          className={cn(
                            'tabular-nums font-semibold',
                            point.total >= 0 && 'text-foreground',
                            point.total < 0 && 'text-destructive',
                          )}
                        >
                          {formatCurrency(point.total, defaultCurrency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          {t('networth.assetsLabel')}
                        </span>
                        <span className="tabular-nums">
                          {formatCurrency(point.assets, defaultCurrency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          {t('networth.liabilitiesLabel')}
                        </span>
                        <span className="tabular-nums">
                          {formatCurrency(point.liabilities, defaultCurrency)}
                        </span>
                      </div>
                    </div>
                  );
                }}
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
      </CardContent>
    </Card>
  );
}

export default NetWorthChart;
