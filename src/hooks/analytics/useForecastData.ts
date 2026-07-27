import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  useDataConfig,
  useExpensesData,
  useIncomesData,
  useRecurringData,
} from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import {
  computeSafeToSpend,
  computeTwelveMonthProjection,
  computeUpcomingRecurringThisMonth,
} from '@/lib/forecast';

// Wires DataContext slices into the pure forecast math (lib/forecast.ts).
// ForecastSection only renders for Pro users, so the full expense history is
// used directly — no free-window filtering here.
export const useForecastData = () => {
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const { recurringExpenses, recurringIncomes } = useRecurringData();
  const { monthlyBudget } = useDataConfig();
  const dateLocale = useDateLocale();

  return useMemo(() => {
    const now = new Date();
    const thisMonthKey = format(now, 'yyyy-MM');

    // YYYY-MM-DD dates: slicing the month key off the string is ~10x faster
    // than parseISO per row (same pattern as useAnalyticsData).
    let spentThisMonth = 0;
    for (const expense of expenses) {
      if (expense.date.slice(0, 7) === thisMonthKey) {
        spentThisMonth += expense.amount;
      }
    }

    const safeToSpend = computeSafeToSpend({
      monthlyBudget,
      spentThisMonth,
      upcomingRecurringThisMonth: computeUpcomingRecurringThisMonth(
        recurringExpenses,
        now,
      ),
    });

    const projection = computeTwelveMonthProjection({
      expenses,
      incomes,
      recurringExpenses,
      recurringIncomes,
      now,
      formatMonthLabel: (monthStart) =>
        format(monthStart, 'LLL yy', { locale: dateLocale }),
    });

    const noData =
      expenses.length === 0 &&
      incomes.length === 0 &&
      recurringExpenses.length === 0 &&
      recurringIncomes.length === 0;

    return { safeToSpend, projection, noData };
  }, [
    expenses,
    incomes,
    recurringExpenses,
    recurringIncomes,
    monthlyBudget,
    dateLocale,
  ]);
};
