import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { useExpensesData, useIncomesData } from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import { monthsElapsedInYear } from '@/lib/utils';

export const useCashFlowData = (selectedYear: number) => {
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const dateLocale = useDateLocale();

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

  const noData = yearTotals.totalIncome === 0 && yearTotals.totalExpense === 0;

  return { monthlyData, yearTotals, noData };
};
