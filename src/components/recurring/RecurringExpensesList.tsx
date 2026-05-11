import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyStateCard } from '@/components/ui/empty-state-card';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import {
  useDataConfig,
  useExpensesData,
  useRecurringData,
  useCategoriesData,
  useAccountsData,
} from '@/contexts/DataContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format } from 'date-fns';
import type { RecurringExpense } from '@/types/RecurringExpense';
import type { Expense } from '@/types/Expense';
import type { RecurringExpenseFormData } from '@/lib/validations';
import RecurringExpenseForm, {
  type RecurringExpensePrefill,
} from '@/components/recurring/RecurringExpenseForm';
import RecurringExpenseCard from '@/components/recurring/RecurringExpenseCard';
import SubscriptionAuditCard, {
  type RecurringPrefill,
} from '@/components/recurring/SubscriptionAuditCard';
import { useAuth } from '@/contexts/AuthContext';
import { useRecurringExpenseOps } from '@/hooks/dataOps/useRecurringExpenseOps';
import { useRecurringIncomeOps } from '@/hooks/dataOps/useRecurringIncomeOps';
import { formatCurrency, parseCurrencyInput } from '@/lib/utils';
import { calculateNextOccurrence, getMonthlyAmount } from '@/lib/recurring';
import RecurringLoadingState from '@/components/recurring/RecurringLoading';
import { useTranslation } from 'react-i18next';

type RecurringMode = 'expense' | 'income';

const RecurringExpensesList = () => {
  const [mode, setMode] = useState<RecurringMode>('expense');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<
    RecurringExpense | undefined
  >(undefined);
  const [prefill, setPrefill] = useState<RecurringExpensePrefill | undefined>(
    undefined,
  );
  const { recurringExpenses, recurringIncomes } = useRecurringData();
  const { expenseCategories, incomeCategories } = useCategoriesData();
  const expenses = useExpensesData();
  const { accounts } = useAccountsData();
  const { defaultCurrency, isInitialized } = useDataConfig();
  const { session } = useAuth();
  const {
    handleRecurringExpenseSubmit: submitRecurringExpense,
    handleRecurringExpenseDelete: deleteRecurringExpense,
    handleRecurringExpenseToggle: toggleRecurringExpense,
  } = useRecurringExpenseOps();
  const {
    handleRecurringIncomeSubmit: submitRecurringIncome,
    handleRecurringIncomeDelete: deleteRecurringIncome,
    handleRecurringIncomeToggle: toggleRecurringIncome,
  } = useRecurringIncomeOps();
  const { t } = useTranslation();

  let items = recurringExpenses;
  if (mode === 'income') {
    items = recurringIncomes;
  }

  let categories = expenseCategories;
  if (mode === 'income') {
    categories = incomeCategories;
  }

  const investmentAccounts = accounts.filter(
    (a) => a.kind === 'investment' && !a.is_archived,
  );

  const handleSubmit = async (values: RecurringExpenseFormData) => {
    if (!session?.user?.id) return;

    try {
      let categoryId: string | null = values.category_id;
      if (values.category_id === 'none') {
        categoryId = null;
      }

      let endDate: string | null = null;
      if (values.end_date) {
        endDate = format(values.end_date, 'yyyy-MM-dd');
      }

      const data: Partial<RecurringExpense> = {
        amount: parseCurrencyInput(values.amount),
        description: values.description,
        category_id: categoryId,
        frequency: values.frequency,
        start_date: format(values.start_date, 'yyyy-MM-dd'),
        end_date: endDate,
        user_id: session.user.id,
      };

      if (mode === 'expense') {
        data.linked_account_id = values.linked_account_id ?? null;
      }

      if (mode === 'income') {
        await submitRecurringIncome(data, selectedExpense?.id);
      } else {
        await submitRecurringExpense(data, selectedExpense?.id);
      }

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

  const handleDelete = async (id: string) => {
    try {
      if (mode === 'income') {
        await deleteRecurringIncome(id);
      } else {
        await deleteRecurringExpense(id);
      }
    } catch {
      // Error handling is done in the hook
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      if (mode === 'income') {
        await toggleRecurringIncome(id, active);
      } else {
        await toggleRecurringExpense(id, active);
      }
    } catch {
      // Error handling is done in the hook
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedExpense(undefined);
    setPrefill(undefined);
  };

  const handleAddDetected = (next: RecurringPrefill) => {
    setPrefill(next);
    setSelectedExpense(undefined);
    setIsFormOpen(true);
  };

  const activeItems = items.filter((e) => e.active);
  const monthlyTotal = activeItems.reduce(
    (sum, item) => sum + getMonthlyAmount(item),
    0,
  );

  if (!isInitialized) {
    return <RecurringLoadingState />;
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">
              {renderModeTitle(mode, t)}
            </h2>
            {renderMonthlySummary(
              activeItems.length,
              monthlyTotal,
              mode,
              t,
              defaultCurrency,
            )}
          </div>
          <Button
            onClick={() => setIsFormOpen(true)}
            size="sm"
            className="shrink-0"
            aria-label={renderAddCtaLabel(mode, t)}
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">
              {renderAddCtaLabel(mode, t)}
            </span>
          </Button>
        </div>

        {/* Mode toggle */}
        <div
          role="tablist"
          className="inline-flex rounded-full bg-muted p-0.5 self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'expense'}
            onClick={() => setMode('expense')}
            className={`text-xs px-4 py-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${getModeButtonClass(mode === 'expense')}`}
          >
            {t('expenses.title')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'income'}
            onClick={() => setMode('income')}
            className={`text-xs px-4 py-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${getModeButtonClass(mode === 'income')}`}
          >
            {t('income.title')}
          </button>
        </div>
      </div>

      {renderAudit(mode, recurringExpenses, expenses, handleToggle, handleAddDetected)}

      <div className="grid gap-4">
        {renderExpensesList(
          items,
          mode,
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
            prefill={prefill}
            categories={categories}
            investmentAccounts={investmentAccounts}
            type={mode}
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

const renderAudit = (
  mode: RecurringMode,
  recurringExpenses: RecurringExpense[],
  expenses: Expense[],
  onToggle: (id: string, active: boolean) => void,
  onAddDetected: (prefill: RecurringPrefill) => void,
) => {
  if (mode !== 'expense') return null;

  return (
    <SubscriptionAuditCard
      recurringExpenses={recurringExpenses}
      expenses={expenses}
      onToggle={onToggle}
      onAddDetected={onAddDetected}
    />
  );
};

const renderModeTitle = (mode: RecurringMode, t: TranslateFunction): string => {
  if (mode === 'income') {
    return t('recurring.income.title');
  }

  return t('recurring.expensesTitle');
};

const renderAddCtaLabel = (mode: RecurringMode, t: TranslateFunction): string => {
  if (mode === 'income') {
    return t('recurring.income.addRecurring');
  }

  return t('recurring.addRecurring');
};

const getModeButtonClass = (active: boolean): string => {
  if (active) {
    return 'bg-background text-foreground shadow-sm';
  }

  return 'text-muted-foreground hover:text-foreground';
};

const renderMonthlySummary = (
  activeCount: number,
  monthlyTotal: number,
  mode: RecurringMode,
  t: TranslateFunction,
  currency: string,
) => {
  if (activeCount === 0) {
    return null;
  }

  let key = 'recurring.monthlyFrom';
  if (mode === 'income') {
    key = 'recurring.income.monthlyFrom';
  }

  return (
    <p className="text-sm text-muted-foreground">
      {t(key, {
        amount: formatCurrency(monthlyTotal, currency),
        count: activeCount,
      })}
    </p>
  );
};

const renderExpensesList = (
  expenses: RecurringExpense[],
  mode: RecurringMode,
  onEdit: (expense: RecurringExpense) => void,
  onDelete: (id: string) => void,
  onToggle: (id: string, active: boolean) => void,
  onOpenForm: (open: boolean) => void,
  t: TranslateFunction,
) => {
  if (expenses.length === 0) {
    return renderEmptyState(mode, onOpenForm, t);
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
  mode: RecurringMode,
  onOpenForm: (open: boolean) => void,
  t: TranslateFunction,
) => {
  let titleKey = 'recurring.noRecurring';
  let descKey = 'recurring.noRecurringDescription';
  let ctaKey = 'recurring.addFirstRecurring';
  if (mode === 'income') {
    titleKey = 'recurring.income.empty';
    descKey = 'recurring.income.emptyDescription';
    ctaKey = 'recurring.income.addFirstRecurring';
  }

  return (
    <EmptyStateCard
      media={<Repeat className="h-12 w-12 text-muted-foreground/50" />}
      title={t(titleKey)}
      description={t(descKey)}
      actionLabel={t(ctaKey)}
      onAction={() => onOpenForm(true)}
    />
  );
};
