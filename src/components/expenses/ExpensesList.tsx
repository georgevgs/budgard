import { useState, useCallback, useMemo, useOptimistic, useTransition } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Download from 'lucide-react/dist/esm/icons/download';
import Upload from 'lucide-react/dist/esm/icons/upload';
import { FORM_TYPES, type FormType } from '@/components/layout/FormsManager';
import { useData } from '@/contexts/DataContext';
import { useDataOperations } from '@/hooks/useDataOperations';
import { dataService } from '@/services/dataService';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { downloadExpensesAsCSV } from '@/lib/csvExport';
import { Button } from '@/components/ui/button';
import FormsManager from '@/components/layout/FormsManager';
import SpeedDial from '@/components/layout/SpeedDial';
import BudgetProgress from '@/components/budget/BudgetProgress';
import ExpensesMonthlySelector from '@/components/expenses/ExpensesMonthlySelector';
import ExpensesMonthlyOverview from '@/components/expenses/ExpensesMonthlyOverview';
import ExpensesDashboard from '@/components/expenses/ExpensesDashboard';
import { ExpenseLoadingState } from '@/components/expenses/ExpensesLoading';
import ExpensesPagination from '@/components/expenses/ExpensesPagination';
import ExpensesFilter from '@/components/expenses/ExpensesFilter';
import CsvImportDialog from '@/components/expenses/CsvImportDialog';
import { useExpensesFilter } from '@/hooks/useExpensesFilter';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import type { ReceiptOptions } from '@/hooks/useDataOperations';
import ExpensesEmpty from '@/components/expenses/ExpensesEmpty';

// ============================================================================
// Extracted Components for Readability
// ============================================================================

type ExpensesContentProps = {
  expenses: Expense[];
  hasActiveFilters: boolean;
  noMatchMessage: string;
  selectedMonth: string;
  searchQuery: string;
  onAddClick: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
};

const ExpensesContent = ({
  expenses,
  hasActiveFilters,
  noMatchMessage,
  selectedMonth,
  searchQuery,
  onAddClick,
  onEdit,
  onDelete,
}: ExpensesContentProps) => {
  // Has expenses - show paginated list
  if (expenses.length > 0) {
    return (
      <ExpensesPagination expenses={expenses} onEdit={onEdit} onDelete={onDelete} searchQuery={searchQuery} />
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
  const {
    categories,
    expenses,
    tags,
    isLoading,
    isInitialized,
    monthlyBudget,
    setMonthlyBudget,
  } = useData();
  const operations = useDataOperations();
  const { toast } = useToast();
  const [optimisticExpenses, addOptimisticExpense] = useOptimistic(expenses, expensesReducer);
  const [, startTransition] = useTransition();

  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [formType, setFormType] = useState<FormType>(null);
  const [isDashboardVisible, setIsDashboardVisible] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Use the filter hook — pass optimistic list so deletes reflect immediately
  const {
    filteredExpenses,
    monthlyExpenses,
    search,
    selectedCategoryId,
    selectedTagId,
    sortOrder,
    hasActiveFilters,
    setSearch,
    setSelectedCategoryId,
    setSelectedTagId,
    setSortOrder,
    handleClearFilters,
  } = useExpensesFilter({
    expenses: optimisticExpenses,
    selectedMonth,
  });

  const handleExpenseDelete = useCallback(
    (id: string) => {
      if (id.startsWith('temp-')) return;
      startTransition(async () => {
        addOptimisticExpense({ type: 'delete', id });
        await operations.handleExpenseDelete(id);
      });
    },
    [addOptimisticExpense, operations],
  );

  const handleExpenseFormSubmit = useCallback(
    (
      data: Partial<Expense>,
      expenseId?: string,
      receiptOptions?: ReceiptOptions,
    ) => {
      startTransition(async () => {
        const category = categories.find((c) => c.id === data.category_id);
        const tag = tags.find((t) => t.id === data.tag_id);

        if (expenseId) {
          const existing = optimisticExpenses.find((e) => e.id === expenseId);
          if (existing) {
            addOptimisticExpense({
              type: 'update',
              expense: { ...existing, ...data, category, tag },
            });
          }
        } else {
          addOptimisticExpense({
            type: 'add',
            expense: {
              id: `temp-${Date.now()}`,
              user_id: data.user_id!,
              amount: data.amount!,
              description: data.description!,
              date: data.date!,
              category_id: data.category_id,
              tag_id: data.tag_id,
              category,
              tag,
              receipt_path: null,
              created_at: new Date().toISOString(),
            },
          });
        }

        await operations.handleExpenseSubmit(data, expenseId, receiptOptions);
      });
    },
    [addOptimisticExpense, categories, tags, optimisticExpenses, operations],
  );

  const handleBudgetUpdate = useCallback(
    async (amount: number) => {
      const previousBudget = monthlyBudget;
      setMonthlyBudget(amount);

      try {
        await dataService.upsertBudget(amount);
      } catch (error) {
        setMonthlyBudget(previousBudget);
        toast({
          title: t('common.error'),
          description: t('budget.updateError', { defaultValue: 'Failed to update budget' }),
          variant: 'destructive',
        });
        throw error;
      }
    },
    [monthlyBudget, setMonthlyBudget, toast, t],
  );

  const monthlyTotal = useMemo(
    () => monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [monthlyExpenses],
  );

  const filteredTotal = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [filteredExpenses],
  );

  const handleFormClose = useCallback(() => {
    setFormType(null);
    setSelectedExpense(undefined);
  }, []);

  const handleExpenseEdit = useCallback((expense: Expense) => {
    if (expense.id.startsWith('temp-')) return;
    setSelectedExpense(expense);
    setFormType(FORM_TYPES.EDIT_EXPENSE);
  }, []);

  if (!isInitialized || isLoading) {
    return <ExpenseLoadingState />;
  }

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
            filteredTotal={filteredTotal}
            hasActiveFilters={hasActiveFilters}
            selectedMonth={selectedMonth}
            currentMonth={currentMonth}
            isExpanded={isDashboardVisible}
            hasExpenses={filteredExpenses.length > 0}
            expenses={filteredExpenses}
            onCurrentMonthClick={() => setSelectedMonth(currentMonth)}
            onMonthlyTotalClick={() =>
              setIsDashboardVisible(!isDashboardVisible)
            }
          />

          <ExpensesFilter
            categories={categories}
            tags={tags}
            search={search}
            selectedCategoryId={selectedCategoryId}
            selectedTagId={selectedTagId}
            sortOrder={sortOrder}
            hasActiveFilters={hasActiveFilters}
            onSearchChange={setSearch}
            onCategoryChange={setSelectedCategoryId}
            onTagChange={setSelectedTagId}
            onSortChange={setSortOrder}
            onClearFilters={handleClearFilters}
          />

          {renderSearchResultCount(
            search,
            filteredExpenses.length,
            monthlyExpenses.length,
            t,
          )}

          {/* Collapsible Dashboard */}
          <div
            className={cn(
              'grid transition-all duration-200 ease-in-out',
              isDashboardVisible
                ? 'grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="overflow-hidden space-y-3">
              {/* Budget Progress */}
              <BudgetProgress
                monthlyBudget={monthlyBudget}
                monthlySpent={monthlyTotal}
                onBudgetUpdate={handleBudgetUpdate}
              />

              {renderDashboard(filteredExpenses, categories)}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImportDialogOpen(true)}
                  className="text-muted-foreground"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t('import.importCSV')}
                </Button>
                {renderExportButton(
                  filteredExpenses,
                  categories,
                  selectedMonth,
                  t,
                )}
              </div>
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
            searchQuery={search}
            onAddClick={() => setFormType(FORM_TYPES.NEW_EXPENSE)}
            onEdit={handleExpenseEdit}
            onDelete={handleExpenseDelete}
          />
        </div>
      </div>

      {/* Forms Manager */}
      <FormsManager
        formType={formType}
        onClose={handleFormClose}
        selectedExpense={selectedExpense}
        onExpenseSubmit={handleExpenseFormSubmit}
      />

      {/* CSV Import Dialog */}
      <CsvImportDialog
        open={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
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

// ─── Helper render functions ──────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderSearchResultCount = (
  search: string,
  filteredCount: number,
  totalCount: number,
  t: TranslateFunction,
) => {
  if (search.length === 0) return null;

  return (
    <p className="text-xs text-muted-foreground px-1">
      {t('expenses.search.resultCount', {
        count: filteredCount,
        total: totalCount,
      })}
    </p>
  );
};

const renderDashboard = (expenses: Expense[], categories: Category[]) => {
  if (expenses.length === 0) return null;

  return <ExpensesDashboard expenses={expenses} categories={categories} />;
};

const renderExportButton = (
  expenses: Expense[],
  categories: Category[],
  selectedMonth: string,
  t: TranslateFunction,
) => {
  if (expenses.length === 0) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        downloadExpensesAsCSV({ expenses, categories, selectedMonth })
      }
      className="text-muted-foreground"
    >
      <Download className="h-4 w-4 mr-2" />
      {t('expenses.exportCSV')}
    </Button>
  );
};

// ============================================================================
// Optimistic reducer
// ============================================================================

type OptimisticAction =
  | { type: 'add'; expense: Expense }
  | { type: 'update'; expense: Expense }
  | { type: 'delete'; id: string };

const expensesReducer = (
  state: Expense[],
  action: OptimisticAction,
): Expense[] => {
  switch (action.type) {
    case 'add':
      return [action.expense, ...state];
    case 'update':
      return state.map((e) =>
        e.id === action.expense.id ? action.expense : e,
      );
    case 'delete':
      return state.filter((e) => e.id !== action.id);
  }
};
