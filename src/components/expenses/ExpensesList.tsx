import { useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { FORM_TYPES, type FormType } from '@/components/layout/FormsManager';
import { useData } from '@/contexts/DataContext';
import { useDataOperations } from '@/hooks/useDataOperations';
import { cn } from '@/lib/utils';
import FormsManager from '@/components/layout/FormsManager';
import SpeedDial from '@/components/layout/SpeedDial';
import ExpensesMonthlySelector from '@/components/expenses/ExpensesMonthlySelector';
import ExpensesMonthlyOverview from '@/components/expenses/ExpensesMonthlyOverview';
import ExpensesDashboard from '@/components/expenses/ExpensesDashboard';
import ExpenseLoadingState from '@/components/expenses/ExpensesLoading';
import ExpensesPagination from '@/components/expenses/ExpensesPagination';
import ExpensesFilter from '@/components/expenses/ExpensesFilter';
import { useExpensesFilter } from '@/hooks/useExpensesFilter';
import { Expense } from '@/types/Expense';
import ExpensesEmpty from '@/components/expenses/ExpensesEmpty';

// ============================================================================
// Extracted Components for Readability
// ============================================================================

interface ExpensesContentProps {
  expenses: Expense[];
  hasActiveFilters: boolean;
  noMatchMessage: string;
  selectedMonth: string;
  onAddClick: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

const ExpensesContent = ({
  expenses,
  hasActiveFilters,
  noMatchMessage,
  selectedMonth,
  onAddClick,
  onEdit,
  onDelete,
}: ExpensesContentProps) => {
  // Has expenses - show paginated list
  if (expenses.length > 0) {
    return (
      <ExpensesPagination expenses={expenses} onEdit={onEdit} onDelete={onDelete} />
    );
  }

  // No expenses, but filters are active - show "no matches" message
  if (hasActiveFilters) {
    return (
      <div className="text-center py-12 px-4 rounded-lg border-2 border-dashed">
        <p className="text-sm text-muted-foreground">{noMatchMessage}</p>
      </div>
    );
  }

  // No expenses at all - show empty state
  return <ExpensesEmpty selectedMonth={selectedMonth} onAddClick={onAddClick} />;
};

// ============================================================================
// Main Component
// ============================================================================

const ExpensesList = () => {
  const { t } = useTranslation();
  const { categories, expenses, isLoading, isInitialized } = useData();
  const operations = useDataOperations();

  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [formType, setFormType] = useState<FormType>(null);
  const [isDashboardVisible, setIsDashboardVisible] = useState(false);
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Use the filter hook
  const {
    filteredExpenses,
    search,
    selectedCategoryId,
    hasActiveFilters,
    setSearch,
    setSelectedCategoryId,
    handleClearFilters,
  } = useExpensesFilter({
    expenses,
    selectedMonth,
  });

  if (!isInitialized || isLoading) {
    return <ExpenseLoadingState />;
  }

  const monthlyTotal = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );

  const handleFormClose = () => {
    setFormType(null);
    setSelectedExpense(undefined);
  };

  const handleExpenseEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setFormType(FORM_TYPES.EDIT_EXPENSE);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-58px)]">
      <div className="flex-1 container max-w-4xl mx-auto px-4 pt-4 pb-4">
        {/* Month Selection and Overview Section */}
        <div className="space-y-3 mb-4">
          <ExpensesMonthlySelector
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
          <ExpensesMonthlyOverview
            monthlyTotal={monthlyTotal}
            selectedMonth={selectedMonth}
            currentMonth={currentMonth}
            isExpanded={isDashboardVisible}
            hasExpenses={filteredExpenses.length > 0}
            expenses={filteredExpenses}
            categories={categories}
            onCurrentMonthClick={() => setSelectedMonth(currentMonth)}
            onMonthlyTotalClick={() =>
              setIsDashboardVisible(!isDashboardVisible)
            }
          />

          <ExpensesFilter
            categories={categories}
            search={search}
            selectedCategoryId={selectedCategoryId}
            hasActiveFilters={hasActiveFilters}
            onSearchChange={setSearch}
            onCategoryChange={setSelectedCategoryId}
            onClearFilters={handleClearFilters}
          />

          {/* Collapsible Dashboard */}
          <div
            className={cn(
              'grid transition-all duration-200 ease-in-out',
              isDashboardVisible
                ? 'grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="overflow-hidden">
              {filteredExpenses.length > 0 && (
                <ExpensesDashboard
                  expenses={filteredExpenses}
                  categories={categories}
                />
              )}
            </div>
          </div>
        </div>

        {/* Expenses List Section */}
        <div className="flex-1">
          <ExpensesContent
            expenses={filteredExpenses}
            hasActiveFilters={hasActiveFilters}
            noMatchMessage={t('expenses.noExpensesMatchFilter')}
            selectedMonth={selectedMonth}
            onAddClick={() => setFormType(FORM_TYPES.NEW_EXPENSE)}
            onEdit={handleExpenseEdit}
            onDelete={operations.handleExpenseDelete}
          />
        </div>
      </div>

      {/* Forms Manager */}
      <FormsManager
        formType={formType}
        onClose={handleFormClose}
        selectedExpense={selectedExpense}
      />

      {/* Speed Dial */}
      <SpeedDial
        onAddExpense={() => setFormType(FORM_TYPES.NEW_EXPENSE)}
        onAddCategory={() => setFormType(FORM_TYPES.NEW_CATEGORY)}
      />
    </div>
  );
};

export default ExpensesList;
