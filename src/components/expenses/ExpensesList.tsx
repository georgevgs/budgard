import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
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
  const { t } = useTranslation();
  const templates = useTemplatesData();
  const { isInitialized, isHistoryLoaded, defaultCurrency } = useDataConfig();
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

  // Boot usually hydrates from the local snapshot in well under a frame, so
  // the skeleton is held back briefly rather than flashed and yanked away.
  const showSkeleton = useDelayedLoading(!isInitialized);

  if (!isInitialized) {
    return renderLoading(showSkeleton);
  }

  return (
    <div>
      <div className="container max-w-4xl mx-auto px-4 pt-5 pb-4">
        <h1 className="sr-only">{t('expenses.title')}</h1>
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

        <ExpensesContent
          filter={filter}
          selectedMonth={selectedMonth}
          isHistoryPending={!isHistoryLoaded}
          onAddClick={formState.openNewExpenseForm}
          onEdit={formState.handleExpenseEdit}
          onDelete={handleExpenseDelete}
          onSaveAsTemplate={handleSaveAsTemplate}
        />
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

const renderLoading = (showSkeleton: boolean) => {
  if (!showSkeleton) {
    return null;
  }

  return <ExpenseLoadingState />;
};

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
