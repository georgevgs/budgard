import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import type { Expense } from '@/types/Expense';

interface UseExpensesFilterProps {
  expenses: Expense[];
  selectedMonth: string;
}

interface UseExpensesFilterReturn {
  filteredExpenses: Expense[];
  search: string;
  selectedCategoryId: string | null;
  setSearch: (value: string) => void;
  setSelectedCategoryId: (value: string | null) => void;
  handleFilterChange: (search: string, categoryId: string | null) => void;
  handleClearFilters: () => void;
  hasActiveFilters: boolean;
}

export const useExpensesFilter = ({
  expenses,
  selectedMonth,
}: UseExpensesFilterProps): UseExpensesFilterReturn => {
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  const hasActiveFilters = search.length > 0 || selectedCategoryId !== null;

  // Pre-filter expenses by month once
  const monthlyExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      return format(new Date(expense.date), 'yyyy-MM') === selectedMonth;
    });
  }, [expenses, selectedMonth]);

  // Then apply search and category filters
  const filteredExpenses = useMemo(() => {
    if (!hasActiveFilters) {
      return monthlyExpenses.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    }

    const searchLower = search.toLowerCase();

    return monthlyExpenses
      .filter((expense) => {
        const matchesSearch = search
          ? expense.description.toLowerCase().includes(searchLower)
          : true;
        const matchesCategory = selectedCategoryId
          ? expense.category_id === selectedCategoryId
          : true;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [monthlyExpenses, search, selectedCategoryId, hasActiveFilters]);

  const handleFilterChange = (newSearch: string, categoryId: string | null) => {
    setSearch(newSearch);
    setSelectedCategoryId(categoryId);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategoryId(null);
  };

  return {
    filteredExpenses,
    search,
    selectedCategoryId,
    setSearch,
    setSelectedCategoryId,
    handleFilterChange,
    handleClearFilters,
    hasActiveFilters,
  };
};
