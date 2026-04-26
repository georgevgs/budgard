import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
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
import { Card, CardContent } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { formatCurrency, cn } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';
import type { Expense } from '@/types/Expense';

const INCOME_COLOR = 'hsl(var(--income))';
const EXPENSE_COLOR = 'hsl(var(--destructive))';
const NET_COLOR = 'hsl(var(--primary))';

type Props = {
  selectedYear: number;
};

const CashFlowSection = ({ selectedYear }: Props) => {
  const { t, i18n } = useTranslation();
  const { expenses, incomes, defaultCurrency } = useData();
  const dateLocale = i18n.language === 'el' ? el : enUS;
  const currencySymbol = getCurrencySymbol(defaultCurrency);

  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const m = (i + 1).toString().padStart(2, '0');

      return `${selectedYear}-${m}`;
    });

    return months.map((monthKey) => {
      const monthExpenses = expenses.filter(
        (e: Expense) => format(parseISO(e.date), 'yyyy-MM') === monthKey,
      );
      const monthIncomes = incomes.filter(
        (e: Expense) => format(parseISO(e.date), 'yyyy-MM') === monthKey,
      );

      const expenseTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
      const incomeTotal = monthIncomes.reduce((s, e) => s + e.amount, 0);

      return {
        month: format(parseISO(`${monthKey}-01`), 'LLL', { locale: dateLocale }),
        fullMonth: format(parseISO(`${monthKey}-01`), 'LLLL yyyy', {
          locale: dateLocale,
        }),
        income: incomeTotal,
        expense: -expenseTotal,
        net: incomeTotal - expenseTotal,
      };
    });
  }, [expenses, incomes, selectedYear, dateLocale]);

  const yearTotals = useMemo(() => {
    const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
    const totalExpense = monthlyData.reduce((s, m) => s - m.expense, 0);

    return {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      avgNet: monthlyData.length > 0 ? (totalIncome - totalExpense) / 12 : 0,
    };
  }, [monthlyData]);

  const noData =
    yearTotals.totalIncome === 0 && yearTotals.totalExpense === 0;

  if (noData) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-foreground">
        {t('cashFlow.title')}
      </h3>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">
                {t('cashFlow.yearNet', { year: selectedYear })}
              </p>
              <p
                className={cn(
                  'text-3xl font-bold tabular-nums tracking-tight',
                  yearTotals.net >= 0 ? 'text-income' : 'text-destructive',
                )}
              >
                {yearTotals.net >= 0 ? '+' : ''}
                {formatCurrency(yearTotals.net, defaultCurrency)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
              <div>
                <p className="text-xs text-muted-foreground">
                  {t('cashFlow.totalIncome')}
                </p>
                <p className="text-base font-semibold tabular-nums text-income mt-0.5">
                  {formatCurrency(yearTotals.totalIncome, defaultCurrency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t('cashFlow.totalExpense')}
                </p>
                <p className="text-base font-semibold tabular-nums text-destructive mt-0.5">
                  {formatCurrency(yearTotals.totalExpense, defaultCurrency)}
                </p>
              </div>
            </div>
            {renderAvgNet(yearTotals.avgNet, defaultCurrency, t)}
          </div>

          <div className="pt-1 border-t border-border/40">
            <p className="text-sm font-medium mb-3 mt-2">
              {t('cashFlow.monthly')}
            </p>
            {renderChart(monthlyData, currencySymbol, defaultCurrency, t)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashFlowSection;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderAvgNet = (
  avgNet: number,
  currency: string,
  t: TranslateFunction,
) => {
  if (avgNet === 0) return null;

  return (
    <p className="text-xs text-muted-foreground">
      {t('cashFlow.avgPerMonth', {
        amount: formatCurrency(avgNet, currency),
      })}
    </p>
  );
};

type ChartPoint = {
  month: string;
  fullMonth: string;
  income: number;
  expense: number;
  net: number;
};

const renderChart = (
  data: ChartPoint[],
  currencySymbol: string,
  currency: string,
  t: TranslateFunction,
) => {
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
                        point.net >= 0 ? 'text-income' : 'text-destructive',
                      )}
                    >
                      {point.net >= 0 ? '+' : ''}
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
            name={t('income.title') as string}
            radius={[6, 6, 0, 0]}
          />
          <Bar
            dataKey="expense"
            stackId="cashflow"
            fill={EXPENSE_COLOR}
            name={t('expenses.title') as string}
            radius={[0, 0, 6, 6]}
          />
          <Line
            type="monotone"
            dataKey="net"
            stroke={NET_COLOR}
            strokeWidth={2}
            dot={{ r: 3, fill: NET_COLOR }}
            activeDot={{ r: 4 }}
            name={t('income.netCashFlow') as string}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
