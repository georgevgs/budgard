import { Suspense, useState } from 'react';
import { format } from 'date-fns';
import FormsManager from '@/components/layout/FormsManager';
import { useDataConfig, useTemplatesData } from '@/contexts/DataContext';
import { useTemplateOps } from '@/hooks/dataOps/useTemplateOps';
import { useOptimisticExpenseActions } from '@/hooks/expensesList/useOptimisticExpenseActions';
import { useExpenseAlerts } from '@/hooks/expensesList/useExpenseAlerts';
import { useExpenseTotals } from '@/hooks/expensesList/useExpenseTotals';
import { useExpenseFormState } from '@/hooks/expensesList/useExpenseFormState';
import { useOpenFormFromUrl } from '@/hooks/expensesList/useOpenFormFromUrl';
import { useExpensesFilter } from '@/hooks/useExpensesFilter';
import SpeedDial from '@/components/layout/SpeedDial';
import { ExpenseLoadingState } from '@/components/expenses/ExpensesLoading';
import ExpensesOverviewSection from '@/components/expenses/ExpensesOverviewSection';
import ExpensesContent from '@/components/expenses/ExpensesContent';
import FilterResultsAnnouncer from '@/components/expenses/FilterResultsAnnouncer';
import TemplatesBar from '@/components/expenses/TemplatesBar';
import WeeklyRecapCard from '@/components/recap/WeeklyRecapCard';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

// Lazy: the CSV import flow (~35 KB min incl. parsing logic) is a rare,
// user-initiated action — no reason to ship it with the primary route chunk.
const CsvImportDialog = lazyWithRetry(
  () => import('@/components/expenses/CsvImportDialog'),
);

const ExpensesList = () => {
  const templates = useTemplatesData();
  const { isInitialized, defaultCurrency } = useDataConfig();
  const { handleTemplateDelete } = useTemplateOps();
  const formState = useExpenseFormState();
  const [isDashboardVisible, setIsDashboardVisible] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const {
    optimisticExpenses,
    handleExpenseDelete,
    handleExpenseFormSubmit,
    handleSaveAsTemplate,
    handleUseTemplate,
  } = useOptimisticExpenseActions();

  useOpenFormFromUrl(isInitialized, formState.setFormType);

  // Pass the optimistic list so deletes reflect immediately
  const filter = useExpensesFilter({
    expenses: optimisticExpenses,
    selectedMonth,
  });
  const { monthlyTotal, filteredTotal, baseTotal } = useExpenseTotals(filter);

  useExpenseAlerts({ selectedMonth, currentMonth, monthlyTotal });

  if (!isInitialized) {
    return <ExpenseLoadingState />;
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem-env(safe-area-inset-top))] pb-20">
      <div className="flex-1 container max-w-4xl mx-auto px-4 pt-5 pb-4">
        <div className="mb-4 space-y-3">
          <WeeklyRecapCard />
        </div>

        <ExpensesOverviewSection
          selectedMonth={selectedMonth}
          currentMonth={currentMonth}
          onMonthChange={setSelectedMonth}
          isDashboardVisible={isDashboardVisible}
          onToggleDashboard={() => setIsDashboardVisible((prev) => !prev)}
          filter={filter}
          baseTotal={baseTotal}
          filteredTotal={filteredTotal}
          monthlyTotal={monthlyTotal}
          allExpensesCount={optimisticExpenses.length}
          onOpenImport={() => setIsImportDialogOpen(true)}
        />

        <TemplatesBar
          templates={templates}
          defaultCurrency={defaultCurrency}
          onUse={handleUseTemplate}
          onDelete={handleTemplateDelete}
        />

        <FilterResultsAnnouncer
          count={filter.filteredExpenses.length}
          active={filter.hasActiveFilters}
        />

        <div className="flex-1">
          <ExpensesContent
            filter={filter}
            selectedMonth={selectedMonth}
            onAddClick={formState.openNewExpenseForm}
            onEdit={formState.handleExpenseEdit}
            onDelete={handleExpenseDelete}
            onSaveAsTemplate={handleSaveAsTemplate}
          />
        </div>
      </div>

      <FormsManager
        formType={formState.formType}
        onClose={formState.handleFormClose}
        selectedExpense={formState.selectedExpense}
        onExpenseSubmit={handleExpenseFormSubmit}
      />

      {renderImportDialog(isImportDialogOpen, () =>
        setIsImportDialogOpen(false),
      )}

      <SpeedDial
        onAddExpense={formState.openNewExpenseForm}
        onAddCategory={formState.openNewCategoryForm}
      />
    </div>
  );
};

export default ExpensesList;

// --- Helpers ---

const renderImportDialog = (open: boolean, onClose: () => void) => {
  if (!open) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <CsvImportDialog open={open} onClose={onClose} />
    </Suspense>
  );
};
