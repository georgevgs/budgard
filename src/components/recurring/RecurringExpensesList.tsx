import { Button } from '@/components/ui/button';
import { EmptyStateCard } from '@/components/ui/empty-state-card';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { RecurringExpense } from '@/types/RecurringExpense';
import RecurringExpenseForm from '@/components/recurring/RecurringExpenseForm';
import RecurringExpenseCard from '@/components/recurring/RecurringExpenseCard';
import { useRecurringList } from '@/hooks/recurring/useRecurringList';
import type { RecurringMode } from '@/hooks/recurring/useRecurringActions';
import { formatCurrency } from '@/lib/utils';
import { calculateNextOccurrence } from '@/lib/recurring';
import PageHeader from '@/components/common/PageHeader';
import RecurringLoadingState from '@/components/recurring/RecurringLoading';
import { useTranslation } from 'react-i18next';
import RecurringSuggestions from '@/components/recurring/RecurringSuggestions';

const RecurringExpensesList = () => {
  const { t } = useTranslation();
  const list = useRecurringList();

  if (!list.isInitialized) {
    return renderLoading(list.showSkeleton);
  }

  return (
    <div className="page-shell space-y-4">
      <div className="flex flex-col gap-4">
        {renderHeader(
          list.mode,
          list.activeCount,
          list.monthlyTotal,
          list.defaultCurrency,
          list.handleAddClick,
          t,
        )}

        {renderModeToggle(list.mode, list.setMode, t)}
      </div>

      <RecurringSuggestions
        suggestions={list.suggestions}
        currency={list.defaultCurrency}
        onAccept={list.handleSuggestionAccept}
        onDismiss={list.handleSuggestionDismiss}
      />

      <div className="grid gap-4">
        {renderExpensesList(
          list.items,
          list.mode,
          list.handleEdit,
          list.handleDelete,
          list.handleToggle,
          list.openForm,
          t,
        )}
      </div>

      <Dialog open={list.isFormOpen} onOpenChange={list.closeForm}>
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0"
          onOpenChange={list.closeForm}
        >
          <RecurringExpenseForm
            expense={list.selectedExpense}
            categories={list.categories}
            investmentAccounts={list.investmentAccounts}
            type={list.mode}
            onSubmit={list.handleSubmit}
            onClose={list.closeForm}
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
        className="h-10 rounded-full px-3.5"
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
  <div role="tablist" className="segmented self-start">
    <button
      type="button"
      role="tab"
      aria-selected={mode === 'expense'}
      data-active={mode === 'expense'}
      onClick={() => setMode('expense')}
      className={SEGMENT}
    >
      {t('expenses.title')}
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={mode === 'income'}
      data-active={mode === 'income'}
      onClick={() => setMode('income')}
      className={SEGMENT}
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

const SEGMENT =
  'segmented-item cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const renderAddCtaLabel = (
  mode: RecurringMode,
  t: TranslateFunction,
): string => {
  if (mode === 'income') {
    return t('recurring.income.addRecurring');
  }

  return t('recurring.addRecurring');
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
