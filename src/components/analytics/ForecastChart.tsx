import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';
import {
  ChartTooltipShell,
  ChartTooltipRow,
} from '@/components/common/ChartTooltip';
import type { ProjectionMonth } from '@/lib/forecast';

const INCOME_COLOR = 'hsl(var(--income))';
const EXPENSE_COLOR = 'hsl(var(--primary))';

type Props = {
  data: ProjectionMonth[];
  currencySymbol: string;
  currency: string;
};

const ForecastChart = ({ data, currencySymbol, currency }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={288}>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
        >
          <XAxis
            dataKey="label"
            stroke="currentColor"
            className="text-xs text-muted-foreground"
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="currentColor"
            className="text-xs text-muted-foreground"
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}${currencySymbol}`}
            width={60}
          />
          <Tooltip
            cursor={{ stroke: 'currentColor', strokeOpacity: 0.15 }}
            content={({ active, payload }) =>
              renderTooltipContent(active, payload, currency, t)
            }
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
            iconType="circle"
          />
          <Line
            type="monotone"
            dataKey="projectedIncome"
            stroke={INCOME_COLOR}
            strokeWidth={2}
            dot={{ r: 3, fill: INCOME_COLOR }}
            activeDot={{ r: 4 }}
            name={t('analytics.forecast.projectedIncome')}
          />
          <Line
            type="monotone"
            dataKey="projectedExpenses"
            stroke={EXPENSE_COLOR}
            strokeWidth={2}
            dot={{ r: 3, fill: EXPENSE_COLOR }}
            activeDot={{ r: 4 }}
            name={t('analytics.forecast.projectedSpending')}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default memo(ForecastChart);

// --- Helpers ---

type TooltipEntries = ReadonlyArray<{ payload?: unknown }> | undefined;

type TranslateFunction = (key: string) => string;

const renderTooltipContent = (
  active: boolean | undefined,
  payload: TooltipEntries,
  currency: string,
  t: TranslateFunction,
) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as ProjectionMonth;

  return (
    <ChartTooltipShell title={point.label}>
      <ChartTooltipRow
        label={t('analytics.forecast.projectedIncome')}
        labelClassName="text-income-ink"
        value={`+${formatCurrency(point.projectedIncome, currency)}`}
      />
      <ChartTooltipRow
        label={t('analytics.forecast.projectedSpending')}
        labelClassName="text-destructive-ink"
        value={`-${formatCurrency(point.projectedExpenses, currency)}`}
      />
      <ChartTooltipRow
        label={t('analytics.forecast.projectedNet')}
        labelClassName="font-medium"
        value={`${renderNetSign(point.projectedNet)}${formatCurrency(point.projectedNet, currency)}`}
        valueClassName={cn('font-semibold', getNetClass(point.projectedNet))}
        separated
      />
    </ChartTooltipShell>
  );
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
