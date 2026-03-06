import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, cn } from '@/lib/utils';
import BudgetForm from '@/components/budget/BudgetForm';

type BudgetProgressProps = {
  monthlyBudget: number | null;
  monthlySpent: number;
  onBudgetUpdate: (amount: number) => Promise<void>;
};

const BudgetProgress = ({
  monthlyBudget,
  monthlySpent,
  onBudgetUpdate,
}: BudgetProgressProps) => {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);

  // No budget set - show CTA
  if (monthlyBudget === null) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsFormOpen(true)}
          className="w-full justify-start text-muted-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('budget.setBudget')}
        </Button>

        <BudgetForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={onBudgetUpdate}
          currentBudget={null}
        />
      </>
    );
  }

  const percentage = Math.min((monthlySpent / monthlyBudget) * 100, 100);
  const remaining = monthlyBudget - monthlySpent;
  const isOverBudget = monthlySpent >= monthlyBudget;
  const isWarning = percentage >= 80 && percentage < 100;

  const getProgressColor = () => {
    if (isOverBudget) return 'bg-destructive';
    if (isWarning) return 'bg-yellow-500';
    return 'bg-primary';
  };

  return (
    <>
      <div className="space-y-2">
        {/* Header with label and edit button */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {t('budget.monthlyBudget')}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFormOpen(true)}
            className="h-6 w-6 p-0"
            aria-label={t('budget.editBudget')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Progress bar */}
        <Progress
          value={percentage}
          className="h-2"
          indicatorClassName={getProgressColor()}
          aria-label={t('budget.budgetProgress', {
            current: formatCurrency(monthlySpent),
            total: formatCurrency(monthlyBudget),
          })}
        />

        {/* Budget amounts */}
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {t('budget.budgetProgress', {
              current: formatCurrency(monthlySpent),
              total: formatCurrency(monthlyBudget),
            })}
          </span>
          <span
            className={cn(
              'font-medium',
              isOverBudget && 'text-destructive',
              isWarning && 'text-yellow-600 dark:text-yellow-500',
            )}
          >
            {renderRemainingLabel(isOverBudget, remaining, monthlyBudget, t)}
          </span>
        </div>
      </div>

      <BudgetForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={onBudgetUpdate}
        currentBudget={monthlyBudget}
      />
    </>
  );
};

export default BudgetProgress;

// ─── Helper render functions ──────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderRemainingLabel = (
  isOverBudget: boolean,
  remaining: number,
  monthlyBudget: number,
  t: TranslateFunction,
) => {
  if (isOverBudget) return t('budget.overBudget');

  return `${formatCurrency(remaining)} ${t('budget.remaining')}`;
};
