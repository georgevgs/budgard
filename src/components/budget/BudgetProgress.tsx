import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, cn } from '@/lib/utils';
import BudgetForm from '@/components/budget/BudgetForm';
import CategoryBudgetsManager from '@/components/budget/CategoryBudgetsManager';
import BudgetCategorySection, {
  WARNING_THRESHOLD,
  EXCEEDED_THRESHOLD,
  type BudgetCategoryRow,
} from '@/components/budget/BudgetCategorySection';
import {
  useExpensesData,
  useCategoriesData,
  useCategoryBudgetsData,
} from '@/contexts/DataContext';
import { useCurrentMonthSpendingByCategory } from '@/hooks/useCurrentMonthSpendingByCategory';
import type { Category } from '@/types/Category';
import type { CategoryBudget } from '@/types/CategoryBudget';

type BudgetProgressProps = {
  monthlyBudget: number | null;
  monthlySpent: number;
  onBudgetUpdate: (amount: number) => Promise<void>;
  currencyCode?: string;
};

const BudgetProgress = ({
  monthlyBudget,
  monthlySpent,
  onBudgetUpdate,
  currencyCode = 'EUR',
}: BudgetProgressProps) => {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const { expenseCategories } = useCategoriesData();
  const categoryBudgets = useCategoryBudgetsData();
  const expenses = useExpensesData();
  const spendingByCategory = useCurrentMonthSpendingByCategory(expenses);
  const categoryRows = useMemo(
    () => buildCategoryRows(expenseCategories, categoryBudgets, spendingByCategory),
    [expenseCategories, categoryBudgets, spendingByCategory],
  );

  const openForm = () => setIsFormOpen(true);
  const closeForm = () => setIsFormOpen(false);
  const openManager = () => setIsManagerOpen(true);
  const closeManager = () => setIsManagerOpen(false);

  if (monthlyBudget === null) {
    return renderNoBudgetState({
      isFormOpen,
      onOpen: openForm,
      onClose: closeForm,
      onSubmit: onBudgetUpdate,
      currencyCode,
      t,
    });
  }

  return renderBudgetState({
    monthlyBudget,
    monthlySpent,
    currencyCode,
    onBudgetUpdate,
    isFormOpen,
    isManagerOpen,
    onFormOpen: openForm,
    onFormClose: closeForm,
    onManagerOpen: openManager,
    onManagerClose: closeManager,
    expenseCategoryCount: expenseCategories.length,
    categoryRows,
    t,
  });
};

export default memo(BudgetProgress);

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

type NoBudgetProps = {
  isFormOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
  currencyCode: string;
  t: TranslateFunction;
};

const renderNoBudgetState = ({
  isFormOpen,
  onOpen,
  onClose,
  onSubmit,
  currencyCode,
  t,
}: NoBudgetProps) => {
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={onOpen}
        className="w-full justify-start text-muted-foreground"
      >
        <Plus className="h-4 w-4 mr-2" />
        {t('budget.setBudget')}
      </Button>

      <BudgetForm
        isOpen={isFormOpen}
        onClose={onClose}
        onSubmit={onSubmit}
        currentBudget={null}
        currencyCode={currencyCode}
      />
    </>
  );
};

type BudgetStateProps = {
  monthlyBudget: number;
  monthlySpent: number;
  currencyCode: string;
  onBudgetUpdate: (amount: number) => Promise<void>;
  isFormOpen: boolean;
  isManagerOpen: boolean;
  onFormOpen: () => void;
  onFormClose: () => void;
  onManagerOpen: () => void;
  onManagerClose: () => void;
  expenseCategoryCount: number;
  categoryRows: BudgetCategoryRow[];
  t: TranslateFunction;
};

const renderBudgetState = ({
  monthlyBudget,
  monthlySpent,
  currencyCode,
  onBudgetUpdate,
  isFormOpen,
  isManagerOpen,
  onFormOpen,
  onFormClose,
  onManagerOpen,
  onManagerClose,
  expenseCategoryCount,
  categoryRows,
  t,
}: BudgetStateProps) => {
  const percentage = Math.min((monthlySpent / monthlyBudget) * 100, 100);
  const remaining = monthlyBudget - monthlySpent;
  const isOverBudget = monthlySpent >= monthlyBudget;
  const isWarning =
    percentage >= WARNING_THRESHOLD && percentage < EXCEEDED_THRESHOLD;
  const progressColor = pickProgressColor(isOverBudget, isWarning);

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {t('budget.monthlyBudget')}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onFormOpen}
            className="h-8 w-8"
            aria-label={t('budget.editBudget')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Progress
          value={percentage}
          className="h-2"
          indicatorClassName={progressColor}
          aria-label={t('budget.budgetProgress', {
            current: formatCurrency(monthlySpent, currencyCode),
            total: formatCurrency(monthlyBudget, currencyCode),
          })}
        />

        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {t('budget.budgetProgress', {
              current: formatCurrency(monthlySpent, currencyCode),
              total: formatCurrency(monthlyBudget, currencyCode),
            })}
          </span>
          <span
            className={cn(
              'font-medium',
              isOverBudget && 'text-destructive',
              isWarning && 'text-amber-600 dark:text-amber-500',
            )}
          >
            {renderRemainingLabel(isOverBudget, remaining, t, currencyCode)}
          </span>
        </div>

        <BudgetCategorySection
          totalCategoryCount={expenseCategoryCount}
          rows={categoryRows}
          currency={currencyCode}
          onManage={onManagerOpen}
        />
      </div>

      <BudgetForm
        isOpen={isFormOpen}
        onClose={onFormClose}
        onSubmit={onBudgetUpdate}
        currentBudget={monthlyBudget}
        currencyCode={currencyCode}
      />

      <CategoryBudgetsManager
        isOpen={isManagerOpen}
        onClose={onManagerClose}
      />
    </>
  );
};

const pickProgressColor = (isOverBudget: boolean, isWarning: boolean) => {
  if (isOverBudget) return 'bg-destructive';
  if (isWarning) return 'bg-amber-500';

  return 'bg-primary';
};

const renderRemainingLabel = (
  isOverBudget: boolean,
  remaining: number,
  t: TranslateFunction,
  currency: string,
) => {
  if (isOverBudget) return t('budget.overBudget');

  return `${formatCurrency(remaining, currency)} ${t('budget.remaining')}`;
};

const buildCategoryRows = (
  categories: Category[],
  budgets: CategoryBudget[],
  spending: Map<string, number>,
): BudgetCategoryRow[] => {
  const byCategoryId = new Map(categories.map((c) => [c.id, c]));
  const rows: BudgetCategoryRow[] = [];

  for (const budget of budgets) {
    const category = byCategoryId.get(budget.category_id);
    if (!category) continue;

    const spent = spending.get(category.id) ?? 0;
    const percent = computePercent(spent, budget.monthly_amount);

    rows.push({
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon ?? null,
      cap: budget.monthly_amount,
      spent,
      percent,
      remaining: budget.monthly_amount - spent,
      isOver: spent >= budget.monthly_amount,
      isWarning: percent >= WARNING_THRESHOLD && percent < EXCEEDED_THRESHOLD,
    });
  }

  rows.sort(compareRowUrgency);

  return rows;
};

const computePercent = (spent: number, cap: number) => {
  if (cap === 0) return 0;

  return (spent / cap) * 100;
};

const compareRowUrgency = (a: BudgetCategoryRow, b: BudgetCategoryRow) => {
  if (a.isOver && !b.isOver) return -1;
  if (!a.isOver && b.isOver) return 1;

  return b.percent - a.percent;
};
