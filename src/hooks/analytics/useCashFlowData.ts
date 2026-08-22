import { useMemo } from 'react';
import { format } from 'date-fns';
import { useExpensesData, useIncomesData } from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import { monthsElapsedInYear } from '@/lib/utils';
import { countsInTotals } from '@/lib/spending';
import { sumAmounts } from '@/lib/money';

export const useCashFlowData = (selectedYear: number) => {
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const dateLocale = useDateLocale();

  const monthlyData = useMemo(() => {
    const expByMonth = new Array(12).fill(0);
    const incByMonth = new Array(12).fill(0);

    // YYYY-MM-DD dates: slicing the year/month straight off the string is
    // ~10x faster than parseISO per row (see useExpensesFilter).
    //
    // A transfer between the user's own accounts is a row on both sides. Left
    // in, it inflated the income bar and the expense bar by the same amount —
    // net stayed right by luck while both bars, and avgNet's numerator, were
    // wrong.
    for (const e of expenses) {
      if (!countsInTotals(e)) continue;
      if (Number(e.date.slice(0, 4)) !== selectedYear) continue;
      expByMonth[Number(e.date.slice(5, 7)) - 1] += e.amount;
    }

    for (const i of incomes) {
      if (!countsInTotals(i)) continue;
      if (Number(i.date.slice(0, 4)) !== selectedYear) continue;
      incByMonth[Number(i.date.slice(5, 7)) - 1] += i.amount;
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
    const totalIncome = sumAmounts(monthlyData.map((m) => m.income));
    const totalExpense = sumAmounts(monthlyData.map((m) => -m.expense));

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

  const noData = yearTotals.totalIncome === 0 && yearTotals.totalExpense === 0;

  return { monthlyData, yearTotals, noData };
};
