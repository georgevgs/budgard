import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import ExpensesPagination from '@/components/expenses/ExpensesPagination';
import ExpensesEmpty from '@/components/expenses/ExpensesEmpty';
import type { ExpensesFilterApi } from '@/hooks/useExpensesFilter';
import type { Expense } from '@/types/Expense';

type Props = {
  filter: ExpensesFilterApi;
  selectedMonth: string;
  onAddClick: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onSaveAsTemplate: (expense: Expense) => void;
};

const ExpensesContent = ({
  filter,
  selectedMonth,
  onAddClick,
  onEdit,
  onDelete,
  onSaveAsTemplate,
}: Props) => {
  const { t } = useTranslation();

  // Has expenses - show paginated list
  if (filter.filteredExpenses.length > 0) {
    return (
      <ExpensesPagination
        expenses={filter.filteredExpenses}
        onEdit={onEdit}
        onDelete={onDelete}
        onSaveAsTemplate={onSaveAsTemplate}
        searchQuery={filter.search}
        showFullDate={filter.isSearchingAllMonths || !!filter.dateRangePreset}
      />
    );
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
