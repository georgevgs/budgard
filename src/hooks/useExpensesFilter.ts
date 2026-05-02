import { useState, useMemo, useDeferredValue } from 'react';
import { format, subDays, startOfQuarter, startOfYear } from 'date-fns';
import type { Expense } from '@/types/Expense';

// ISO-8601 timestamps and YYYY-MM-DD dates sort lexicographically.
// String comparison is ~10x faster than parseISO + getTime for hot paths.
const compareExpensesDateDesc = (a: Expense, b: Expense): number => {
  if (b.date !== a.date) {
    return b.date < a.date ? -1 : 1;
  }

  if (b.created_at === a.created_at) {
    return 0;
  }

  return b.created_at < a.created_at ? -1 : 1;
};

const compareExpensesDateAsc = (a: Expense, b: Expense): number => {
  return -compareExpensesDateDesc(a, b);
};

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
  const [search, setSearchRaw] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('date-desc');
  const [isSearchingAllMonths, setIsSearchingAllMonths] = useState(false);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>(null);

  // Auto-switch to all months when user types a search query, revert when cleared
  const setSearch = (value: string) => {
    setSearchRaw(value);
    if (value.length > 0) {
      setIsSearchingAllMonths(true);
    } else {
      setIsSearchingAllMonths(false);
    }
  };

  const hasActiveFilters =
    search.length > 0 || !!selectedCategoryId || selectedTagId !== null;

  // Sort all expenses once for cross-month search.
  // The DB returns expenses pre-sorted, but optimistic `add` actions prepend
  // a freshly-created row that may break ordering — so we re-sort defensively.
  const allExpensesSorted = useMemo(() => {
    return [...expenses].sort(compareExpensesDateDesc);
  }, [expenses]);

  // Pre-filter expenses by month — both date (YYYY-MM-DD) and selectedMonth
  // (YYYY-MM) are ISO-formatted, so a prefix check beats parsing.
  const monthlyExpenses = useMemo(() => {
    return allExpensesSorted.filter((expense) =>
      expense.date.startsWith(selectedMonth),
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

    const startISO = format(start, 'yyyy-MM-dd');

    return allExpensesSorted.filter((expense) => expense.date >= startISO);
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
              (expense.category?.name.toLowerCase().includes(searchLower) ??
                false) ||
              (expense.tag?.name.toLowerCase().includes(searchLower) ?? false)
            : true;
          const matchesCategory = selectedCategoryId
            ? selectedCategoryId === 'uncategorized'
              ? expense.category_id === null ||
                expense.category_id === undefined
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

    if (sortOrder === 'date-asc') {
      return [...filtered].sort(compareExpensesDateAsc);
    }

    if (sortOrder === 'amount-desc') {
      return [...filtered].sort((a, b) => b.amount - a.amount);
    }

    return [...filtered].sort((a, b) => a.amount - b.amount);
  }, [
    monthlyExpenses,
    allExpensesSorted,
    dateRangeExpenses,
    dateRangePreset,
    isSearchingAllMonths,
    deferredSearch,
    selectedCategoryId,
    selectedTagId,
    hasActiveFilters,
    sortOrder,
  ]);

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
