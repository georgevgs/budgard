import { CategoryDrillDown } from '@/pages/analytics/components/CategoryDrillDown';
import { MonthDrillDown } from '@/pages/analytics/components/MonthDrillDown';
import type { useAnalyticsDrillDown } from '@/pages/analytics/hooks/useAnalyticsDrillDown';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';

type AnalyticsDrillDownDialogsProps = {
  drillDown: ReturnType<typeof useAnalyticsDrillDown>;
  expenses: Expense[];
  categories: Category[];
};

export const AnalyticsDrillDownDialogs = ({
  drillDown,
  expenses,
  categories,
}: AnalyticsDrillDownDialogsProps) => {
  return (
    <>
      {renderCategory(drillDown)}
      {renderMonth(drillDown, expenses, categories)}
    </>
  );
};
// --- Helpers ---

type DrillDown = ReturnType<typeof useAnalyticsDrillDown>;

const renderCategory = (drillDown: DrillDown) => {
  const category = drillDown.drillDownCategory;
  if (!category) {
    return null;
  }

  return (
    <CategoryDrillDown
      isOpen={true}
      onClose={drillDown.handleCategoryDrillDownClose}
      categoryName={category.name}
      categoryColor={category.color}
      expenses={drillDown.drillDownCategoryExpenses}
      totalAmount={category.amount}
    />
  );
};

const renderMonth = (
  drillDown: DrillDown,
  expenses: Expense[],
  categories: Category[],
) => {
  const monthKey = drillDown.drillDownMonthKey;
  if (!monthKey) {
    return null;
  }

  return (
    <MonthDrillDown
      isOpen={true}
      onClose={drillDown.handleMonthDrillDownClose}
      monthKey={monthKey}
      expenses={expenses}
      categories={categories}
    />
  );
};
