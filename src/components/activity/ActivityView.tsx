import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/common/PageHeader';
import ActivityFeed from '@/components/activity/ActivityFeed';
import ActivityFilters from '@/components/activity/ActivityFilters';
import ActivityPeriodSelector from '@/components/activity/ActivityPeriodSelector';
import ActivitySummary from '@/components/activity/ActivitySummary';
import ActivityTemplates from '@/components/activity/ActivityTemplates';
import ActivityFilterPanel from '@/components/activity/ActivityFilterPanel';
import ActivityToolsMenu from '@/components/activity/ActivityToolsMenu';
import FilterResultsAnnouncer from '@/components/expenses/FilterResultsAnnouncer';
import { ExpenseLoadingState } from '@/components/expenses/ExpensesLoading';
import {
  useCategoriesData,
  useDataConfig,
  useTagsData,
} from '@/contexts/DataContext';
import { useQuickAdd } from '@/contexts/QuickAddContext';
import {
  useActivityFeed,
  type ActivityPeriod,
} from '@/hooks/activity/useActivityFeed';
import { useActivityCsvExport } from '@/hooks/activity/useActivityCsvExport';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { useSeedIncomeCategories } from '@/hooks/incomeList/useSeedIncomeCategories';
import { isMonthPendingHistory } from '@/lib/dataCache';

const ActivityView = () => {
  const { t } = useTranslation();
  const { isInitialized, isHistoryLoaded, defaultCurrency } = useDataConfig();
  const { categories } = useCategoriesData();
  const tags = useTagsData();
  const quickAdd = useQuickAdd();
  const activity = useActivityFeed(quickAdd.optimisticExpenses);
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
      <div className="page-shell">
        <PageHeader
          title={t('activity.title')}
          action={
            <ActivityToolsMenu
              isExportDisabled={csvExport.isExportDisabled}
              onExport={csvExport.handleExport}
            />
          }
        />
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
            trailing={
              <ActivityFilterPanel
                categories={categories}
                tags={tags}
                selectedCategoryId={activity.selectedCategoryId}
                selectedTagId={activity.selectedTagId}
                onCategoryChange={activity.setSelectedCategoryId}
                onTagChange={activity.setSelectedTagId}
              />
            }
          />
          <ActivityTemplates onUse={quickAdd.handleUseTemplate} />
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
            onExpenseEdit={quickAdd.handleExpenseEdit}
            onExpenseDelete={quickAdd.handleExpenseDelete}
            onSaveAsTemplate={quickAdd.handleSaveAsTemplate}
            onIncomeEdit={quickAdd.handleIncomeEdit}
            onIncomeDelete={quickAdd.handleIncomeDelete}
          />
        </div>
      </div>
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
