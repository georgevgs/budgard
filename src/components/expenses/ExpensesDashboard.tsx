import { useTranslation } from 'react-i18next';
import { memo, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useDataConfig } from '@/contexts/DataContext';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

type ExpensesDashboardProps = {
  expenses: Expense[];
  categories: Category[];
}

const ExpensesDashboard = ({
  expenses,
  categories,
}: ExpensesDashboardProps) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();

  const categoryData = useMemo(() => {
    const categoryExpenses = expenses.reduce<Record<string, Expense[]>>(
      (acc, expense) => {
        const categoryId = expense.category_id;
        if (!categoryId) return acc;

        if (!acc[categoryId]) {
          acc[categoryId] = [];
        }
        acc[categoryId].push(expense);
        return acc;
      },
      {},
    );

    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    return categories
      .map((category) => {
        const categoryExpenseList = categoryExpenses[category.id] || [];
        const amount = categoryExpenseList.reduce(
          (sum, expense) => sum + expense.amount,
          0,
        );
        const percentage = total > 0 ? (amount / total) * 100 : 0;

        return {
          id: category.id,
          name: category.name,
          amount,
          percentage,
          color: category.color,
        };
      })
      .filter((cat) => cat.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, categories]);

  const formatPercentage = (percentage: number): string => {
    if (percentage === 0) return t('dashboard.zeroPercent');
    if (percentage < 1) return t('dashboard.lessThanOnePercent');
    return t('dashboard.percent', { value: Math.round(percentage) });
  };

  if (categoryData.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/50 rounded-2xl">
      <CardContent className="pt-4 pb-2">
        <div className="w-full space-y-1">
          {categoryData.map((category) => (
            <div
              key={category.id}
              className="py-2"
              aria-label={t('dashboard.categoryBreakdown', {
                name: category.name,
                amount: formatCurrency(category.amount, defaultCurrency),
                percent: formatPercentage(category.percentage),
              })}
            >
              <div className="flex items-center gap-3 mb-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: category.color }}
                  aria-hidden="true"
                />
                <span className="flex-1 text-sm font-medium truncate">
                  {category.name}
                </span>
                <span
                  className="text-sm font-semibold shrink-0 tabular-nums"
                  style={{ color: category.color }}
                >
                  {formatCurrency(category.amount, defaultCurrency)}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 w-8 text-right tabular-nums">
                  {formatPercentage(category.percentage)}
                </span>
              </div>
              <div className="ml-5 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${category.percentage}%`,
                    backgroundColor: category.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(ExpensesDashboard);
