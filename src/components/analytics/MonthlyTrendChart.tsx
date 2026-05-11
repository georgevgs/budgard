import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { CategoricalChartFunc } from 'recharts/types/chart/types';
import { formatCurrency } from '@/lib/utils';

const BUDGET_LINE_COLOR = '#f59e0b';

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

const MonthlyTrendChart = ({
  data,
  monthlyBudget,
  defaultCurrency,
  currencySymbol,
  yAxisMax,
  onMonthClick,
}: Props) => {
  const { t } = useTranslation();

  const handleClick: CategoricalChartFunc = (nextState) => {
    const index = nextState?.activeTooltipIndex;
    if (typeof index !== 'number' || index < 0) return;

    onMonthClick(index);
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart
        data={data}
        onClick={handleClick}
        margin={{ top: 4, right: 4, bottom: 0, left: -12 }}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="hsl(var(--primary))"
              stopOpacity={0.7}
            />
            <stop
              offset="100%"
              stopColor="hsl(var(--primary))"
              stopOpacity={0.1}
            />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{
            fill: 'hsl(var(--muted-foreground))',
            fontSize: 12,
          }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{
            fill: 'hsl(var(--muted-foreground))',
            fontSize: 12,
          }}
          tickFormatter={(val: number) =>
            `${Math.round(val)}${currencySymbol}`
          }
          domain={[0, yAxisMax ?? 'auto']}
        />
        <Tooltip
          content={<ChartTooltip currency={defaultCurrency} />}
          cursor={{
            stroke: 'hsl(var(--border))',
            strokeDasharray: '4 4',
          }}
        />
        {renderBudgetReferenceLine(monthlyBudget, t, defaultCurrency)}
        <Area
          type="monotone"
          dataKey="amount"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#areaGradient)"
          dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
          activeDot={{
            r: 6,
            fill: 'hsl(var(--primary))',
            strokeWidth: 0,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default memo(MonthlyTrendChart);

// --- Helpers ---

type TooltipPayloadEntry = {
  value: number;
  payload: { fullMonth: string };
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  currency?: string;
};

const ChartTooltip = ({
  active,
  payload,
  currency = 'EUR',
}: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;

  const { value, payload: data } = payload[0];

  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground">{data.fullMonth}</p>
      <p className="text-sm font-semibold tabular-nums">
        {formatCurrency(value, currency)}
      </p>
    </div>
  );
};

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderBudgetReferenceLine = (
  monthlyBudget: number | null,
  t: TFunc,
  currency: string,
) => {
  if (!monthlyBudget) return null;

  return (
    <ReferenceLine
      y={monthlyBudget}
      stroke={BUDGET_LINE_COLOR}
      strokeDasharray="5 5"
      label={{
        value: t('analytics.budgetLabel', {
          amount: formatCurrency(monthlyBudget, currency),
        }),
        position: 'right',
        fill: BUDGET_LINE_COLOR,
        fontSize: 11,
      }}
    />
  );
};
