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

  // Pre-filter expenses by month once
  const monthlyExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      return format(new Date(expense.date), 'yyyy-MM') === selectedMonth;
    });
  }, [expenses, selectedMonth]);

  // Then apply search and category/tag filters
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
          ? selectedCategoryId === 'uncategorized'
            ? expense.category_id === null || expense.category_id === undefined
            : expense.category_id === selectedCategoryId
          : true;
        const matchesTag = selectedTagId
          ? expense.tag_id === selectedTagId
          : true;

        return matchesSearch && matchesCategory && matchesTag;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
