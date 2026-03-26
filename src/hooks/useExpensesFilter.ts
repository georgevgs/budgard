import { useState, useMemo, useDeferredValue } from 'react';
import { format, parseISO, subDays, startOfQuarter, startOfYear } from 'date-fns';
import type { Expense } from '@/types/Expense';

export type SortOrder = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export type DateRangePreset =
  | 'last7'
  | 'last30'
  | 'last90'
  | 'thisQuarter'
  | 'thisYear'
  | null;

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
  dateRangePreset: DateRangePreset;
  setSearch: (value: string) => void;
  setSelectedCategoryId: (value: string | null) => void;
  setSelectedTagId: (value: string | null) => void;
  setSortOrder: (value: SortOrder) => void;
  setIsSearchingAllMonths: (value: boolean) => void;
  setDateRangePreset: (value: DateRangePreset) => void;
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
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>(null);

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

  // Filter by date range preset when active
  const dateRangeExpenses = useMemo(() => {
    if (!dateRangePreset) return null;

    const now = new Date();
    let start: Date;

    switch (dateRangePreset) {
      case 'last7':
        start = subDays(now, 7);
        break;
      case 'last30':
        start = subDays(now, 30);
        break;
      case 'last90':
        start = subDays(now, 90);
        break;
      case 'thisQuarter':
        start = startOfQuarter(now);
        break;
      case 'thisYear':
        start = startOfYear(now);
        break;
    }

    const startTime = start.getTime();

    return allExpensesSorted.filter(
      (expense) => parseISO(expense.date).getTime() >= startTime,
    );
  }, [allExpensesSorted, dateRangePreset]);

  // Apply search/category/tag filters then sort
  // When "all months" toggle is on, search across ALL expenses
  // When date range is active, use date-filtered expenses
  // deferredSearch keeps the input snappy while filtering is deferred
  const filteredExpenses = useMemo(() => {
    const searchLower = deferredSearch.toLowerCase();

    let baseExpenses: Expense[];
    if (dateRangePreset) {
      baseExpenses = dateRangeExpenses ?? [];
    } else if (isSearchingAllMonths) {
      baseExpenses = allExpensesSorted;
    } else {
      baseExpenses = monthlyExpenses;
    }

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
  }, [monthlyExpenses, allExpensesSorted, dateRangeExpenses, dateRangePreset, isSearchingAllMonths, deferredSearch, selectedCategoryId, selectedTagId, hasActiveFilters, sortOrder]);

  const handleFilterChange = (newSearch: string, categoryId: string | null) => {
    setSearch(newSearch);
    setSelectedCategoryId(categoryId);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategoryId(null);
    setSelectedTagId(null);
    setIsSearchingAllMonths(false);
    setDateRangePreset(null);
  };

  return {
    filteredExpenses,
    monthlyExpenses,
    search,
    selectedCategoryId,
    selectedTagId,
    sortOrder,
    isSearchingAllMonths,
    dateRangePreset,
    setSearch,
    setSelectedCategoryId,
    setSelectedTagId,
    setSortOrder,
    setIsSearchingAllMonths,
    setDateRangePreset,
    handleFilterChange,
    handleClearFilters,
    hasActiveFilters,
  };
};
