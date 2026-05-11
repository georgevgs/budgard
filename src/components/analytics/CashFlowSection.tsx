import { lazy, Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import {
  useExpensesData,
  useIncomesData,
  useDataConfig,
} from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import { formatCurrency, cn, monthsElapsedInYear } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';

const CashFlowChart = lazy(
  () => import('@/components/analytics/CashFlowChart'),
);

type Props = {
  selectedYear: number;
};

const CashFlowSection = ({ selectedYear }: Props) => {
  const { t } = useTranslation();
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const { defaultCurrency } = useDataConfig();
  const dateLocale = useDateLocale();
  const currencySymbol = getCurrencySymbol(defaultCurrency);

  const monthlyData = useMemo(() => {
    const expByMonth = new Array(12).fill(0);
    const incByMonth = new Array(12).fill(0);

    for (const e of expenses) {
      const d = parseISO(e.date);
      if (d.getFullYear() !== selectedYear) continue;
      expByMonth[d.getMonth()] += e.amount;
    }

    for (const i of incomes) {
      const d = parseISO(i.date);
      if (d.getFullYear() !== selectedYear) continue;
      incByMonth[d.getMonth()] += i.amount;
    }

    return Array.from({ length: 12 }, (_, idx) => {
      const monthDate = new Date(selectedYear, idx, 1);
      const incomeTotal = incByMonth[idx];
      const expenseTotal = expByMonth[idx];

      return {
        month: format(monthDate, 'LLL', { locale: dateLocale }),
        fullMonth: format(monthDate, 'LLLL yyyy', { locale: dateLocale }),
        income: incomeTotal,
        expense: -expenseTotal,
        net: incomeTotal - expenseTotal,
      };
    });
  }, [expenses, incomes, selectedYear, dateLocale]);

  const yearTotals = useMemo(() => {
    const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
    const totalExpense = monthlyData.reduce((s, m) => s - m.expense, 0);

    const monthsElapsed = monthsElapsedInYear(selectedYear);
    let avgNet = 0;
    if (monthsElapsed > 0) {
      avgNet = (totalIncome - totalExpense) / monthsElapsed;
    }

    return {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      avgNet,
    };
  }, [monthlyData, selectedYear]);

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
                  getNetClass(yearTotals.net),
                )}
              >
                {renderNetSign(yearTotals.net)}
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
            <Suspense fallback={<div className="h-[288px]" aria-hidden />}>
              <CashFlowChart
                data={monthlyData}
                currencySymbol={currencySymbol}
                currency={defaultCurrency}
              />
            </Suspense>
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
