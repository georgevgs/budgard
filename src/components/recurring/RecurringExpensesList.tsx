import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyStateCard } from '@/components/ui/empty-state-card';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import {
  useDataConfig,
  useRecurringData,
  useCategoriesData,
  useAccountsData,
} from '@/contexts/DataContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { RecurringExpense } from '@/types/RecurringExpense';
import RecurringExpenseForm from '@/components/recurring/RecurringExpenseForm';
import RecurringExpenseCard from '@/components/recurring/RecurringExpenseCard';
import {
  useRecurringActions,
  type RecurringMode,
} from '@/hooks/recurring/useRecurringActions';
import { formatCurrency } from '@/lib/utils';
import { calculateNextOccurrence, getMonthlyAmount } from '@/lib/recurring';
import PageHeader from '@/components/common/PageHeader';
import RecurringLoadingState from '@/components/recurring/RecurringLoading';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { useTranslation } from 'react-i18next';
import { useIsPro } from '@/hooks/useIsPro';
import { useUpgradeDialog } from '@/contexts/UpgradeDialogContext';
import { useToast } from '@/hooks/useToast';
import {
  canAddRecurringExpense,
  FREE_RECURRING_EXPENSE_LIMIT,
} from '@/lib/proLimits';

const RecurringExpensesList = () => {
  const [mode, setMode] = useState<RecurringMode>('expense');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<
    RecurringExpense | undefined
  >(undefined);
  const { recurringExpenses, recurringIncomes } = useRecurringData();
  const { expenseCategories, incomeCategories } = useCategoriesData();
  const { accounts } = useAccountsData();
  const { defaultCurrency, isInitialized } = useDataConfig();
  const { t } = useTranslation();
  const isPro = useIsPro();
  const { openUpgrade } = useUpgradeDialog();
  const { toast } = useToast();

  const { handleSubmit, handleDelete, handleToggle } = useRecurringActions({
    mode,
    selectedExpense,
    onDone: () => {
      setIsFormOpen(false);
      setSelectedExpense(undefined);
    },
  });

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

  const handleEditExpense = (expense: RecurringExpense) => {
    setSelectedExpense(expense);
    setIsFormOpen(true);
  };

  // The free cap applies to recurring expenses only; recurring incomes stay
  // uncapped on every plan.
  const handleAddClick = () => {
    const atFreeCap =
      mode === 'expense' &&
      !canAddRecurringExpense(isPro, recurringExpenses.length);

    if (atFreeCap) {
      toast({
        title: t('pro.gate.recurringLimit', {
          limit: FREE_RECURRING_EXPENSE_LIMIT,
        }),
      });
      openUpgrade();

      return;
    }

    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedExpense(undefined);
  };

  const activeItems = items.filter((e) => e.active);
  const monthlyTotal = activeItems.reduce(
    (sum, item) => sum + getMonthlyAmount(item),
    0,
  );
  const showSkeleton = useDelayedLoading(!isInitialized);

  if (!isInitialized) {
    return renderLoading(showSkeleton);
  }

  return (
    <div className="page-shell space-y-4">
      <div className="flex flex-col gap-4">
        {renderHeader(
          mode,
          activeItems.length,
          monthlyTotal,
          defaultCurrency,
          handleAddClick,
          t,
        )}

        {renderModeToggle(mode, setMode, t)}
      </div>

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

const renderLoading = (showSkeleton: boolean) => {
  if (!showSkeleton) {
    return null;
  }

  return <RecurringLoadingState />;
};

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderHeader = (
  mode: RecurringMode,
  activeCount: number,
  monthlyTotal: number,
  currency: string,
  onAddClick: () => void,
  t: TranslateFunction,
) => (
  <PageHeader
    title={renderModeTitle(mode, t)}
    subtitle={renderMonthlySummary(activeCount, monthlyTotal, mode, t, currency)}
    action={
      <Button
        onClick={onAddClick}
        size="sm"
        aria-label={renderAddCtaLabel(mode, t)}
      >
        <Plus className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">{renderAddCtaLabel(mode, t)}</span>
      </Button>
    }
  />
);

const renderModeToggle = (
  mode: RecurringMode,
  setMode: (mode: RecurringMode) => void,
  t: TranslateFunction,
) => (
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
);

const renderModeTitle = (mode: RecurringMode, t: TranslateFunction): string => {
  if (mode === 'income') {
    return t('recurring.income.title');
  }

  return t('recurring.expensesTitle');
};

const renderAddCtaLabel = (
  mode: RecurringMode,
  t: TranslateFunction,
): string => {
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
): string | undefined => {
  if (activeCount === 0) {
    return undefined;
  }

  let key = 'recurring.monthlyFrom';
  if (mode === 'income') {
    key = 'recurring.income.monthlyFrom';
  }

  return t(key, {
    amount: formatCurrency(monthlyTotal, currency),
    count: activeCount,
  });
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
