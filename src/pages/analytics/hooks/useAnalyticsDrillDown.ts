import { useCallback, useMemo, useState } from 'react';
import type { CategoryRow } from '@/pages/analytics/hooks/useAnalyticsData';
import { UNCATEGORIZED_ID } from '@/pages/analytics/hooks/useMoneyFlowData';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

export const useAnalyticsDrillDown = (
  yearExpenses: Expense[],
  selectedYear: number,
  categories: Category[],
) => {
  const [drillDownCategory, setDrillDownCategory] =
    useState<CategoryRow | null>(null);
  const [drillDownMonthKey, setDrillDownMonthKey] = useState<string | null>(
    null,
  );

  const drillDownCategoryExpenses = useMemo(() => {
    if (!drillDownCategory) {
      return [];
    }

    const categoryIds = new Set(categories.map((category) => category.id));

    return yearExpenses.filter((expense) => {
      if (drillDownCategory.id === UNCATEGORIZED_ID) {
        return !expense.category_id || !categoryIds.has(expense.category_id);
      }

      return expense.category_id === drillDownCategory.id;
    });
  }, [yearExpenses, drillDownCategory, categories]);

  const handleCategoryClick = useCallback((cat: CategoryRow) => {
    setDrillDownCategory(cat);
  }, []);

  const handleCategoryDrillDownClose = useCallback(() => {
    setDrillDownCategory(null);
  }, []);

  const handleMonthDrillDownClose = useCallback(() => {
    setDrillDownMonthKey(null);
  }, []);

  const handleMonthClick = useCallback(
    (index: number) => {
      const month = (index + 1).toString().padStart(2, '0');
      setDrillDownMonthKey(`${selectedYear}-${month}`);
    },
    [selectedYear],
  );

  return {
    drillDownCategory,
    drillDownCategoryExpenses,
    drillDownMonthKey,
    handleCategoryClick,
    handleCategoryDrillDownClose,
    handleMonthClick,
    handleMonthDrillDownClose,
  };
};
