import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';

const INCOME_COLOR = 'hsl(var(--income))';
const EXPENSE_COLOR = 'hsl(var(--destructive))';
const NET_COLOR = 'hsl(var(--primary))';

type ChartPoint = {
  month: string;
  fullMonth: string;
  income: number;
  expense: number;
  net: number;
};

type Props = {
  data: ChartPoint[];
  currencySymbol: string;
  currency: string;
};

const CashFlowChart = ({ data, currencySymbol, currency }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={288}>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
        >
          <XAxis
            dataKey="month"
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
            tickFormatter={(value) => `${Math.abs(value)}${currencySymbol}`}
            width={60}
          />
          <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.3} />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const point = payload[0].payload as ChartPoint;

              return (
                <div className="rounded-xl bg-popover border border-border/40 shadow-md p-3 text-xs space-y-1.5">
                  <p className="font-medium text-foreground">
                    {point.fullMonth}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-income">{t('income.title')}</span>
                    <span className="tabular-nums">
                      +{formatCurrency(point.income, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-destructive">
                      {t('expenses.title')}
                    </span>
                    <span className="tabular-nums">
                      -{formatCurrency(Math.abs(point.expense), currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-1.5 mt-1.5">
                    <span className="font-medium">
                      {t('income.netCashFlow')}
                    </span>
                    <span
                      className={cn(
                        'tabular-nums font-semibold',
                        getNetClass(point.net),
                      )}
                    >
                      {renderNetSign(point.net)}
                      {formatCurrency(point.net, currency)}
                    </span>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
            iconType="circle"
          />
          <Bar
            dataKey="income"
            stackId="cashflow"
            fill={INCOME_COLOR}
            name={t('income.title')}
            radius={[6, 6, 0, 0]}
          />
          <Bar
            dataKey="expense"
            stackId="cashflow"
            fill={EXPENSE_COLOR}
            name={t('expenses.title')}
            radius={[0, 0, 6, 6]}
          />
          <Line
            type="monotone"
            dataKey="net"
            stroke={NET_COLOR}
            strokeWidth={2}
            dot={{ r: 3, fill: NET_COLOR }}
            activeDot={{ r: 4 }}
            name={t('income.netCashFlow')}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default memo(CashFlowChart);

// --- Helpers ---

const getNetClass = (net: number): string => {
  if (net >= 0) {
    return 'text-income';
  }

  return 'text-destructive';
};

const renderNetSign = (net: number): string => {
  if (net >= 0) {
    return '+';
  }

  return '';
};
