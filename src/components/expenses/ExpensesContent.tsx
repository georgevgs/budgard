import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import ExpensesPagination from '@/components/expenses/ExpensesPagination';
import ExpensesEmpty from '@/components/expenses/ExpensesEmpty';
import PendingHistoryNotice from '@/components/common/PendingHistoryNotice';
import { isMonthPendingHistory } from '@/lib/dataCache';
import type { ExpensesFilterApi } from '@/hooks/useExpensesFilter';
import type { Expense } from '@/types/Expense';

type Props = {
  filter: ExpensesFilterApi;
  selectedMonth: string;
  isHistoryPending: boolean;
  onAddClick: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onSaveAsTemplate: (expense: Expense) => void;
};

const ExpensesContent = ({
  filter,
  selectedMonth,
  isHistoryPending,
  onAddClick,
  onEdit,
  onDelete,
  onSaveAsTemplate,
}: Props) => {
  const { t } = useTranslation();
  const awaitingOlderRows =
    isHistoryPending && coversOlderRows(filter, selectedMonth);

  // Has expenses - show paginated list
  if (filter.filteredExpenses.length > 0) {
    return (
      <>
        <ExpensesPagination
          expenses={filter.filteredExpenses}
          onEdit={onEdit}
          onDelete={onDelete}
          onSaveAsTemplate={onSaveAsTemplate}
          searchQuery={filter.search}
          showFullDate={filter.isSearchingAllMonths || !!filter.dateRangePreset}
        />
        {renderPendingTail(awaitingOlderRows)}
      </>
    );
  }

  // Nothing to show yet, but rows for this view are still on the way. Saying
  // "no expenses" here would be wrong — and would send the user off to add one
  // they already have.
  if (awaitingOlderRows) {
    return <PendingHistoryNotice />;
  }

  // No expenses, but filters are active - show "no matches" message
  if (filter.hasActiveFilters) {
    return (
      <div
        className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-border/40"
        role="status"
      >
        <p className="text-sm text-muted-foreground mb-3">
          {t('expenses.noExpensesMatchFilter')}
        </p>
        <Button variant="outline" size="sm" onClick={filter.handleClearFilters}>
          {t('expenses.filter.clearAll')}
        </Button>
      </div>
    );
  }

  // No expenses at all - show empty state
  return (
    <ExpensesEmpty selectedMonth={selectedMonth} onAddClick={onAddClick} />
  );
};

export default ExpensesContent;

// --- Helpers ---

// Whether what's on screen reaches back past the stage-1 window: either the
// selected month predates it, or an all-months search spans it.
const coversOlderRows = (
  filter: ExpensesFilterApi,
  selectedMonth: string,
): boolean => {
  if (filter.isSearchingAllMonths) {
    return true;
  }

  return isMonthPendingHistory(selectedMonth);
};

// Shown below a list that already has rows, because more are still arriving.
const renderPendingTail = (awaitingOlderRows: boolean) => {
  if (!awaitingOlderRows) {
    return null;
  }

  return <PendingHistoryNotice />;
};
