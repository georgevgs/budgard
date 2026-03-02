import { useState, useMemo, useDeferredValue } from 'react';
import { format } from 'date-fns';
import type { Expense } from '@/types/Expense';

export type SortOrder = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

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
  sortOrder: SortOrder;
  setSearch: (value: string) => void;
  setSelectedCategoryId: (value: string | null) => void;
  setSelectedTagId: (value: string | null) => void;
  setSortOrder: (value: SortOrder) => void;
  handleFilterChange: (search: string, categoryId: string | null) => void;
  handleClearFilters: () => void;
  hasActiveFilters: boolean;
}

export const useExpensesFilter = ({
  expenses,
  selectedMonth,
}: UseExpensesFilterProps): UseExpensesFilterReturn => {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('date-desc');

  const hasActiveFilters =
    search.length > 0 || !!selectedCategoryId || selectedTagId !== null;

  // Pre-filter expenses by month and sort once — order is preserved by filter()
  const monthlyExpenses = useMemo(() => {
    return expenses
      .filter(
        (expense) =>
          format(new Date(expense.date), 'yyyy-MM') === selectedMonth,
      )
      .slice()
      .sort(
        (a: Expense, b: Expense) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
  }, [expenses, selectedMonth]);

  // Apply search/category/tag filters then sort
  // deferredSearch keeps the input snappy while filtering is deferred
  const filteredExpenses = useMemo(() => {
    const searchLower = deferredSearch.toLowerCase();

    const filtered = hasActiveFilters
      ? monthlyExpenses.filter((expense) => {
          const matchesSearch = deferredSearch
            ? expense.description.toLowerCase().includes(searchLower) ||
              (expense.category?.name.toLowerCase().includes(searchLower) ?? false) ||
              (expense.tag?.name.toLowerCase().includes(searchLower) ?? false)
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
        })
      : monthlyExpenses;

    // monthlyExpenses is already date-desc; skip copy+sort for the default case
    if (sortOrder === 'date-desc') return filtered;

    return [...filtered].sort((a, b) => {
      if (sortOrder === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortOrder === 'amount-desc') return b.amount - a.amount;
      return a.amount - b.amount; // amount-asc
    });
  }, [monthlyExpenses, deferredSearch, selectedCategoryId, selectedTagId, hasActiveFilters, sortOrder]);

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
    sortOrder,
    setSearch,
    setSelectedCategoryId,
    setSelectedTagId,
    setSortOrder,
    handleFilterChange,
    handleClearFilters,
    hasActiveFilters,
  };
};
