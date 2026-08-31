import { useMemo } from 'react';
import {
  useDataConfig,
  useExpensesData,
  useCategoriesData,
  useCategoryBudgetsData,
} from '@/contexts/DataContext';
import { useBudgetAlerts } from '@/hooks/useBudgetAlerts';
import { useCategoryBudgetAlerts } from '@/hooks/useCategoryBudgetAlerts';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useCurrentMonthSpendingByCategory } from '@/hooks/useCurrentMonthSpendingByCategory';

type UseExpenseAlertsArgs = {
  selectedMonth: string;
  currentMonth: string;
  monthlyTotal: number;
};

export const useExpenseAlerts = ({
  selectedMonth,
  currentMonth,
  monthlyTotal,
}: UseExpenseAlertsArgs) => {
  const expenses = useExpensesData();
  const { expenseCategories: categories } = useCategoriesData();
  const categoryBudgets = useCategoryBudgetsData();
  const { monthlyBudget, defaultCurrency } = useDataConfig();
  const { isPro } = useSubscription();

  useBudgetAlerts({
    monthlyBudget,
    monthlySpent: getBudgetSpent(selectedMonth, currentMonth, monthlyTotal),
    defaultCurrency,
  });

  // Per-category alerts read directly from the live `expenses` list because
  // the optimistic copy doesn't include reverted-but-not-yet-purged items.
  const spendingByCategory = useCurrentMonthSpendingByCategory(expenses);
  const categoryAlertInputs = useMemo(() => {
    const byCategoryId = new Map(categories.map((c) => [c.id, c]));

    return categoryBudgets
      .map((budget) => {
        const category = byCategoryId.get(budget.category_id);
        if (!category) return null;

        return {
          categoryId: category.id,
          categoryName: category.name,
          cap: budget.monthly_amount,
          spent: spendingByCategory.get(category.id) ?? 0,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [categoryBudgets, categories, spendingByCategory]);

  // Per-category budgets are a Pro feature — a downgraded user keeps their
  // old caps in the DB, but they shouldn't keep getting the alerts.
  useCategoryBudgetAlerts({
    alerts: categoryAlertInputs,
    defaultCurrency,
    enabled: selectedMonth === currentMonth && isPro,
  });
};

// --- Helpers ---

const getBudgetSpent = (
  selectedMonth: string,
  currentMonth: string,
  monthlyTotal: number,
): number => {
  if (selectedMonth === currentMonth) return monthlyTotal;

  return 0;
};
