import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import type { Expense } from '@/types/Expense';

interface UseExpensesFilterProps {
  expenses: Expense[];
  selectedMonth: string;
}

interface UseExpensesFilterReturn {
  filteredExpenses: Expense[];
  monthlyExpenses: Expense[];
  search: string;
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  setSearch: (value: string) => void;
  setSelectedCategoryId: (value: string | null) => void;
  setSelectedTagId: (value: string | null) => void;
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
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  const hasActiveFilters =
    search.length > 0 || !!selectedCategoryId || selectedTagId !== null;

  // Pre-filter expenses by month and sort once — order is preserved by filter()
  const monthlyExpenses = useMemo(() => {
    return expenses
      .filter(
        (expense) =>
          format(new Date(expense.date), 'yyyy-MM') === selectedMonth,
      )
      .toSorted(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
  }, [expenses, selectedMonth]);

  // Apply search/category/tag filters — no re-sort needed, order preserved
  const filteredExpenses = useMemo(() => {
    if (!hasActiveFilters) {
      return monthlyExpenses;
    }

    const searchLower = search.toLowerCase();

    return monthlyExpenses.filter((expense) => {
      const matchesSearch = search
        ? expense.description.toLowerCase().includes(searchLower)
        : true;
      const matchesCategory = selectedCategoryId
        ? selectedCategoryId === 'uncategorized'
          ? expense.category_id === null || expense.category_id === undefined
          : expense.category_id === selectedCategoryId
        : true;
      const matchesTag = selectedTagId
        ? expense.tag_id === selectedTagId
        : true;

      return matchesSearch && matchesCategory && matchesTag;
    });
  }, [monthlyExpenses, search, selectedCategoryId, selectedTagId, hasActiveFilters]);

  const handleFilterChange = (newSearch: string, categoryId: string | null) => {
    setSearch(newSearch);
    setSelectedCategoryId(categoryId);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategoryId(null);
    setSelectedTagId(null);
  };

  return {
    filteredExpenses,
    monthlyExpenses,
    search,
    selectedCategoryId,
    selectedTagId,
    setSearch,
    setSelectedCategoryId,
    setSelectedTagId,
    handleFilterChange,
    handleClearFilters,
    hasActiveFilters,
  };
};
