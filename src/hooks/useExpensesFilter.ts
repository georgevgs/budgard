import { useState, useMemo, useDeferredValue } from 'react';
import { format, parseISO } from 'date-fns';
import type { Expense } from '@/types/Expense';

export type SortOrder = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

type UseExpensesFilterProps = {
  expenses: Expense[];
  selectedMonth: string;
};

type UseExpensesFilterReturn = {
  filteredExpenses: Expense[];
  monthlyExpenses: Expense[];
  search: string;
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  sortOrder: SortOrder;
  isSearchingAllMonths: boolean;
  setSearch: (value: string) => void;
  setSelectedCategoryId: (value: string | null) => void;
  setSelectedTagId: (value: string | null) => void;
  setSortOrder: (value: SortOrder) => void;
  setIsSearchingAllMonths: (value: boolean) => void;
  handleFilterChange: (search: string, categoryId: string | null) => void;
  handleClearFilters: () => void;
  hasActiveFilters: boolean;
};

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
  const [isSearchingAllMonths, setIsSearchingAllMonths] = useState(false);

  const hasActiveFilters =
    search.length > 0 || !!selectedCategoryId || selectedTagId !== null;

  // Sort all expenses once for cross-month search
  const allExpensesSorted = useMemo(() => {
    return [...expenses].sort((a: Expense, b: Expense) => {
      const dateDiff =
        parseISO(b.date).getTime() - parseISO(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;

      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [expenses]);

  // Pre-filter expenses by month and sort once — order is preserved by filter()
  const monthlyExpenses = useMemo(() => {
    return allExpensesSorted.filter(
      (expense) =>
        format(parseISO(expense.date), 'yyyy-MM') === selectedMonth,
    );
  }, [allExpensesSorted, selectedMonth]);

  // Apply search/category/tag filters then sort
  // When "all months" toggle is on, search across ALL expenses
  // deferredSearch keeps the input snappy while filtering is deferred
  const filteredExpenses = useMemo(() => {
    const searchLower = deferredSearch.toLowerCase();
    const baseExpenses = isSearchingAllMonths ? allExpensesSorted : monthlyExpenses;

    const filtered = hasActiveFilters
      ? baseExpenses.filter((expense) => {
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
      : baseExpenses;

    // base expenses are already date-desc; skip copy+sort for the default case
    if (sortOrder === 'date-desc') return filtered;

    return [...filtered].sort((a, b) => {
      if (sortOrder === 'date-asc') {
        const dateDiff =
          parseISO(a.date).getTime() - parseISO(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;

        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
      if (sortOrder === 'amount-desc') return b.amount - a.amount;
      return a.amount - b.amount; // amount-asc
    });
  }, [monthlyExpenses, allExpensesSorted, isSearchingAllMonths, deferredSearch, selectedCategoryId, selectedTagId, hasActiveFilters, sortOrder]);

  const handleFilterChange = (newSearch: string, categoryId: string | null) => {
    setSearch(newSearch);
    setSelectedCategoryId(categoryId);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategoryId(null);
    setSelectedTagId(null);
    setIsSearchingAllMonths(false);
  };

  return {
    filteredExpenses,
    monthlyExpenses,
    search,
    selectedCategoryId,
    selectedTagId,
    sortOrder,
    isSearchingAllMonths,
    setSearch,
    setSelectedCategoryId,
    setSelectedTagId,
    setSortOrder,
    setIsSearchingAllMonths,
    handleFilterChange,
    handleClearFilters,
    hasActiveFilters,
  };
};
