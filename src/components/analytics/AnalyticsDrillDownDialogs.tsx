import { CategoryDrillDown } from '@/components/analytics/CategoryDrillDown';
import { MonthDrillDown } from '@/components/analytics/MonthDrillDown';
import type { useAnalyticsDrillDown } from '@/hooks/analytics/useAnalyticsDrillDown';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';

type Props = {
  drillDown: ReturnType<typeof useAnalyticsDrillDown>;
  expenses: Expense[];
  categories: Category[];
};

const AnalyticsDrillDownDialogs = ({
  drillDown,
  expenses,
  categories,
}: Props) => {
  return (
    <>
      {renderCategory(drillDown)}
      {renderMonth(drillDown, expenses, categories)}
    </>
  );
};

export default AnalyticsDrillDownDialogs;

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
