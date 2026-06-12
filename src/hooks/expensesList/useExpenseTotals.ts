import { useMemo } from 'react';
import type { ExpensesFilterApi } from '@/hooks/useExpensesFilter';
import type { DateRangePreset } from '@/hooks/useExpensesFilter';

export const useExpenseTotals = (filter: ExpensesFilterApi) => {
  const monthlyTotal = useMemo(
    () =>
      filter.monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [filter.monthlyExpenses],
  );

  const filteredTotal = useMemo(
    () =>
      filter.filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [filter.filteredExpenses],
  );

  const baseTotal = getBaseTotal(
    filter.isSearchingAllMonths,
    filter.dateRangePreset,
    filteredTotal,
    monthlyTotal,
  );

  return { monthlyTotal, filteredTotal, baseTotal };
};

// --- Helpers ---

const getBaseTotal = (
  isSearchingAllMonths: boolean,
  dateRangePreset: DateRangePreset,
  filteredTotal: number,
  monthlyTotal: number,
): number => {
  if (isSearchingAllMonths || dateRangePreset) return filteredTotal;

  return monthlyTotal;
};
