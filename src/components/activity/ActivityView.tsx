import { useTranslation } from 'react-i18next';
import ActivityFeed from '@/components/activity/ActivityFeed';
import ActivityFilters from '@/components/activity/ActivityFilters';
import ActivityPeriodSelector from '@/components/activity/ActivityPeriodSelector';
import ActivitySummary from '@/components/activity/ActivitySummary';
import ActivityTemplates from '@/components/activity/ActivityTemplates';
import ActivityTools from '@/components/activity/ActivityTools';
import FilterResultsAnnouncer from '@/components/expenses/FilterResultsAnnouncer';
import { ExpenseLoadingState } from '@/components/expenses/ExpensesLoading';
import IncomeFormDialog from '@/components/income/IncomeFormDialog';
import FormsManager from '@/components/layout/FormsManager';
import SpeedDial from '@/components/layout/SpeedDial';
import {
  useCategoriesData,
  useDataConfig,
  useTagsData,
} from '@/contexts/DataContext';
import {
  useActivityFeed,
  type ActivityPeriod,
} from '@/hooks/activity/useActivityFeed';
import { useActivityCsvExport } from '@/hooks/activity/useActivityCsvExport';
import { useIncomeOps } from '@/hooks/dataOps/useIncomeOps';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { useExpenseFormState } from '@/hooks/expensesList/useExpenseFormState';
import { useOptimisticExpenseActions } from '@/hooks/expensesList/useOptimisticExpenseActions';
import { useIncomeFormState } from '@/hooks/incomeList/useIncomeFormState';
import { useSeedIncomeCategories } from '@/hooks/incomeList/useSeedIncomeCategories';
import { isMonthPendingHistory } from '@/lib/dataCache';

const ActivityView = () => {
  const { t } = useTranslation();
  const { isInitialized, isHistoryLoaded, defaultCurrency } = useDataConfig();
  const { categories } = useCategoriesData();
  const tags = useTagsData();
  const expenseForm = useExpenseFormState();
  const incomeForm = useIncomeFormState();
  const expenseActions = useOptimisticExpenseActions();
  const { handleIncomeDelete } = useIncomeOps();
  const activity = useActivityFeed(expenseActions.optimisticExpenses);
  const csvExport = useActivityCsvExport(
    activity.filteredRows,
    activity.exportScope,
  );
  const showSkeleton = useDelayedLoading(!isInitialized);

  useSeedIncomeCategories();

  if (!isInitialized) {
    return renderLoading(showSkeleton);
  }

  return (
    <div>
      <div className="mx-auto max-w-3xl px-4 pt-4 pb-5 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.035em]">
          {t('activity.title')}
        </h1>
        <div className="mt-5 space-y-4">
          <ActivityPeriodSelector
            period={activity.period}
            selectedMonth={activity.selectedMonth}
            onPeriodChange={activity.setPeriod}
            onMonthChange={activity.setSelectedMonth}
          />
          <ActivitySummary
            expenseTotal={activity.expenseTotal}
            incomeTotal={activity.incomeTotal}
            currency={defaultCurrency}
          />
          <ActivityFilters
            search={activity.search}
            kind={activity.kind}
            onSearchChange={activity.setSearch}
            onKindChange={activity.setKind}
          />
          <ActivityTools
            categories={categories}
            tags={tags}
            selectedCategoryId={activity.selectedCategoryId}
            selectedTagId={activity.selectedTagId}
            isExportDisabled={csvExport.isExportDisabled}
            isPro={csvExport.isPro}
            onCategoryChange={activity.setSelectedCategoryId}
            onTagChange={activity.setSelectedTagId}
            onExport={csvExport.handleExport}
          />
          <ActivityTemplates onUse={expenseActions.handleUseTemplate} />
        </div>
        <FilterResultsAnnouncer
          count={activity.filteredRows.length}
          active={activity.hasActiveFilters}
        />
        <div className="mt-7">
          <ActivityFeed
            transactions={activity.filteredRows}
            currency={defaultCurrency}
            matchesOutsidePeriod={activity.matchesOutsidePeriod}
            isHistoryPending={isPendingHistory(
              isHistoryLoaded,
              activity.period,
              activity.selectedMonth,
            )}
            onSearchEverywhere={() => activity.setPeriod('all')}
            onExpenseEdit={expenseForm.handleExpenseEdit}
            onExpenseDelete={expenseActions.handleExpenseDelete}
            onSaveAsTemplate={expenseActions.handleSaveAsTemplate}
            onIncomeEdit={incomeForm.handleIncomeEdit}
            onIncomeDelete={handleIncomeDelete}
          />
        </div>
      </div>
      <FormsManager
        formType={expenseForm.formType}
        onClose={expenseForm.handleFormClose}
        selectedExpense={expenseForm.selectedExpense}
        onExpenseSubmit={expenseActions.handleExpenseFormSubmit}
      />
      <IncomeFormDialog
        open={incomeForm.isFormOpen}
        income={incomeForm.selectedIncome}
        onClose={incomeForm.handleFormClose}
      />
      <SpeedDial
        onAddExpense={expenseForm.openNewExpenseForm}
        onAddCategory={expenseForm.openNewCategoryForm}
        onAddIncome={incomeForm.handleAddClick}
      />
    </div>
  );
};

export default ActivityView;

// --- Helpers ---

// Stage 1 fetches the last 12 months; everything older streams in afterwards.
// Only the periods that can actually reach past that horizon care.
const isPendingHistory = (
  isHistoryLoaded: boolean,
  period: ActivityPeriod,
  selectedMonth: string,
): boolean => {
  if (isHistoryLoaded) {
    return false;
  }
  if (period === 'all') {
    return true;
  }
  if (period === 'month') {
    return isMonthPendingHistory(selectedMonth);
  }

  return false;
};

const renderLoading = (showSkeleton: boolean) => {
  if (!showSkeleton) {
    return null;
  }

  return <ExpenseLoadingState />;
};
