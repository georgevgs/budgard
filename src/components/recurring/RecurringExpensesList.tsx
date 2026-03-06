import { useState, useOptimistic, useTransition } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import { useData } from '@/contexts/DataContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format, addWeeks, addMonths, addYears } from 'date-fns';
import type { RecurringExpense } from '@/types/RecurringExpense';
import type { RecurringExpenseFormData } from '@/lib/validations';
import RecurringExpenseForm from '@/components/recurring/RecurringExpenseForm';
import RecurringExpenseCard from '@/components/recurring/RecurringExpenseCard';
import { useAuth } from '@/contexts/AuthContext';
import { useDataOperations } from '@/hooks/useDataOperations';
import { formatCurrency, parseCurrencyInput } from '@/lib/utils';
import RecurringLoadingState from '@/components/recurring/RecurringLoading';
import { useTranslation } from 'react-i18next';

const WEEKS_PER_MONTH = 4.33;
const BIWEEKLY_PERIODS_PER_MONTH = 2.17;

function calculateNextOccurrence(expense: RecurringExpense): Date | null {
  if (!expense.active) return null;
  if (expense.end_date && new Date(expense.end_date) < new Date()) return null;

  const fromDate = expense.last_generated_date
    ? new Date(expense.last_generated_date)
    : new Date(expense.start_date);

  if (
    !expense.last_generated_date &&
    new Date(expense.start_date) > new Date()
  ) {
    return new Date(expense.start_date);
  }

  let nextDate: Date;
  switch (expense.frequency) {
    case 'weekly':
      nextDate = addWeeks(fromDate, 1);
      break;
    case 'biweekly':
      nextDate = addWeeks(fromDate, 2);
      break;
    case 'monthly':
      nextDate = addMonths(fromDate, 1);
      break;
    case 'quarterly':
      nextDate = addMonths(fromDate, 3);
      break;
    case 'yearly':
      nextDate = addYears(fromDate, 1);
      break;
    default:
      nextDate = addMonths(fromDate, 1);
  }

  if (!expense.last_generated_date) {
    return new Date(expense.start_date);
  }

  return nextDate;
}

function getMonthlyAmount(expense: RecurringExpense): number {
  switch (expense.frequency) {
    case 'weekly':
      return expense.amount * WEEKS_PER_MONTH;
    case 'biweekly':
      return expense.amount * BIWEEKLY_PERIODS_PER_MONTH;
    case 'quarterly':
      return expense.amount / 3;
    case 'yearly':
      return expense.amount / 12;
    default:
      return expense.amount;
  }
}

const RecurringExpensesList = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<
    RecurringExpense | undefined
  >(undefined);
  const { recurringExpenses, categories, isLoading } = useData();
  const { session } = useAuth();
  const {
    handleRecurringExpenseSubmit: submitRecurringExpense,
    handleRecurringExpenseDelete: deleteRecurringExpense,
    handleRecurringExpenseToggle: toggleRecurringExpense,
  } = useDataOperations();
  const { t } = useTranslation();
  const [optimisticRecurring, addOptimisticRecurring] = useOptimistic(
    recurringExpenses,
    recurringReducer,
  );
  const [, startTransition] = useTransition();

  const handleSubmit = async (values: RecurringExpenseFormData) => {
    if (!session?.user?.id) return;

    try {
      const expenseData: Partial<RecurringExpense> = {
        ...values,
        user_id: session.user.id,
        amount: parseCurrencyInput(values.amount),
        category_id:
          values.category_id === 'none' ? undefined : values.category_id,
        start_date: format(values.start_date, 'yyyy-MM-dd'),
        end_date: values.end_date
          ? format(values.end_date, 'yyyy-MM-dd')
          : undefined,
      };

      await submitRecurringExpense(expenseData, selectedExpense?.id);

      setIsFormOpen(false);
      setSelectedExpense(undefined);
    } catch {
      // Error handling is done in the hook
    }
  };

  const handleEditExpense = (expense: RecurringExpense) => {
    setSelectedExpense(expense);
    setIsFormOpen(true);
  };

  const handleDelete = (expenseId: string) => {
    startTransition(async () => {
      addOptimisticRecurring({ type: 'delete', id: expenseId });
      await deleteRecurringExpense(expenseId);
    });
  };

  const handleToggle = (expenseId: string, active: boolean) => {
    startTransition(async () => {
      addOptimisticRecurring({ type: 'toggle', id: expenseId, active });
      await toggleRecurringExpense(expenseId, active);
    });
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedExpense(undefined);
  };

  const activeExpenses = optimisticRecurring.filter((e) => e.active);
  const monthlyTotal = activeExpenses.reduce(
    (sum, expense) => sum + getMonthlyAmount(expense),
    0,
  );

  if (isLoading) {
    return <RecurringLoadingState />;
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">
              {t('recurring.expensesTitle')}
            </h2>
            {renderMonthlySummary(activeExpenses.length, monthlyTotal, t)}
          </div>
          <Button
            onClick={() => setIsFormOpen(true)}
            size="sm"
            className="shrink-0"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">
              {t('recurring.addRecurring')}
            </span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {renderExpensesList(
          optimisticRecurring,
          handleEditExpense,
          handleDelete,
          handleToggle,
          setIsFormOpen,
          t,
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0"
          onOpenChange={handleFormClose}
        >
          <RecurringExpenseForm
            expense={selectedExpense}
            categories={categories}
            onSubmit={handleSubmit}
            onClose={handleFormClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecurringExpensesList;

// ─── Helper render functions ──────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderMonthlySummary = (
  activeCount: number,
  monthlyTotal: number,
  t: TranslateFunction,
) => {
  if (activeCount === 0) return null;

  return (
    <p className="text-sm text-muted-foreground">
      {t('recurring.monthlyFrom', {
        amount: formatCurrency(monthlyTotal),
        count: activeCount,
      })}
    </p>
  );
};

const renderExpensesList = (
  expenses: RecurringExpense[],
  onEdit: (expense: RecurringExpense) => void,
  onDelete: (id: string) => void,
  onToggle: (id: string, active: boolean) => void,
  onOpenForm: (open: boolean) => void,
  t: TranslateFunction,
) => {
  if (expenses.length === 0) {
    return renderEmptyState(onOpenForm, t);
  }

  return expenses.map((expense) => {
    const nextOccurrence = calculateNextOccurrence(expense);
    const isOverdue = !!(nextOccurrence && nextOccurrence <= new Date());

    return (
      <RecurringExpenseCard
        key={expense.id}
        expense={expense}
        nextOccurrence={nextOccurrence}
        isOverdue={isOverdue}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggle={onToggle}
      />
    );
  });
};

const renderEmptyState = (
  onOpenForm: (open: boolean) => void,
  t: TranslateFunction,
) => {
  return (
    <Card className="p-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <Repeat className="h-12 w-12 text-muted-foreground/50" />
        <div>
          <p className="font-medium">{t('recurring.noRecurring')}</p>
          <p className="text-sm text-muted-foreground">
            {t('recurring.noRecurringDescription')}
          </p>
        </div>
        <Button
          onClick={() => onOpenForm(true)}
          variant="outline"
          size="sm"
          className="mt-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('recurring.addFirstRecurring')}
        </Button>
      </div>
    </Card>
  );
};

// ─── Optimistic reducer ───────────────────────────────────────────────────────

type RecurringOptimisticAction =
  | { type: 'add'; expense: RecurringExpense }
  | { type: 'update'; expense: RecurringExpense }
  | { type: 'delete'; id: string }
  | { type: 'toggle'; id: string; active: boolean };

const recurringReducer = (
  state: RecurringExpense[],
  action: RecurringOptimisticAction,
): RecurringExpense[] => {
  switch (action.type) {
    case 'add':
      return [action.expense, ...state];
    case 'update':
      return state.map((e) =>
        e.id === action.expense.id ? action.expense : e,
      );
    case 'delete':
      return state.filter((e) => e.id !== action.id);
    case 'toggle':
      return state.map((e) =>
        e.id === action.id ? { ...e, active: action.active } : e,
      );
  }
};
