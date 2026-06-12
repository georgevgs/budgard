import { useCallback, useMemo, useState } from 'react';
import type { CategoryRow } from '@/hooks/analytics/useAnalyticsData';
import type { Expense } from '@/types/Expense';

export const useAnalyticsDrillDown = (
  yearExpenses: Expense[],
  selectedYear: number,
) => {
  const [drillDownCategory, setDrillDownCategory] =
    useState<CategoryRow | null>(null);
  const [drillDownMonthKey, setDrillDownMonthKey] = useState<string | null>(
    null,
  );

  const drillDownCategoryExpenses = useMemo(() => {
    if (!drillDownCategory) return [];

    return yearExpenses.filter((e) => e.category_id === drillDownCategory.id);
  }, [yearExpenses, drillDownCategory]);

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
