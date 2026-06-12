import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { useExpensesData, useIncomesData } from '@/contexts/DataContext';

export const useMonthlyIncomes = (selectedMonth: string, search: string) => {
  const incomes = useIncomesData();
  const expenses = useExpensesData();

  const monthlyIncomes = useMemo(() => {
    return incomes.filter(
      (income) => format(parseISO(income.date), 'yyyy-MM') === selectedMonth,
    );
  }, [incomes, selectedMonth]);

  const filteredIncomes = useMemo(() => {
    if (!search.trim()) return monthlyIncomes;
    const lower = search.toLowerCase();

    return monthlyIncomes.filter((i) => {
      return (
        i.description.toLowerCase().includes(lower) ||
        (i.category?.name.toLowerCase().includes(lower) ?? false)
      );
    });
  }, [monthlyIncomes, search]);

  const monthlyTotal = useMemo(
    () => monthlyIncomes.reduce((sum, i) => sum + i.amount, 0),
    [monthlyIncomes],
  );

  const monthlyExpenseTotal = useMemo(() => {
    return expenses
      .filter((e) => format(parseISO(e.date), 'yyyy-MM') === selectedMonth)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, selectedMonth]);

  return { monthlyIncomes, filteredIncomes, monthlyTotal, monthlyExpenseTotal };
};
