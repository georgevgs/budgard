import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/common/PageHeader';
import ActivityFeed from '@/components/activity/ActivityFeed';
import ActivityFilters from '@/components/activity/ActivityFilters';
import ActivityMonthStepper from '@/components/activity/ActivityMonthStepper';
import ActivitySummary from '@/components/activity/ActivitySummary';
import ActivityFilterPanel from '@/components/activity/ActivityFilterPanel';
import ActivityToolsMenu from '@/components/activity/ActivityToolsMenu';
import ReviewQueueBanner from '@/components/activity/ReviewQueueBanner';
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
import { useCurrentDate } from '@/hooks/useCurrentDate';
import { useSeedIncomeCategories } from '@/hooks/incomeList/useSeedIncomeCategories';
import { isMonthPendingHistory } from '@/lib/dataCache';

const ActivityView = () => {
  const { t } = useTranslation();
  const { isInitialized, isHistoryLoaded, defaultCurrency } = useDataConfig();
  const { categories } = useCategoriesData();
  const tags = useTagsData();
  const quickAdd = useQuickAdd();
  const now = useCurrentDate();
  const activity = useActivityFeed(quickAdd.optimisticExpenses, now);
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
        <div className="mt-4 space-y-3">
          <ReviewQueueBanner />
          <ActivityFilters
            search={activity.search}
            isSearchingAllTime={activity.isSearchingAllTime}
            onSearchChange={activity.setSearch}
            trailing={
              <ActivityFilterPanel
                categories={categories}
                tags={tags}
                kind={activity.kind}
                period={activity.period}
                selectedCategoryId={activity.selectedCategoryId}
                selectedTagId={activity.selectedTagId}
                onKindChange={activity.setKind}
                onPeriodChange={activity.setPeriod}
                onCategoryChange={activity.setSelectedCategoryId}
                onTagChange={activity.setSelectedTagId}
              />
            }
          />
          <ActivityMonthStepper
            period={activity.effectivePeriod}
            selectedMonth={activity.selectedMonth}
            onMonthChange={activity.setSelectedMonth}
          />
          <ActivitySummary
            expenseTotal={activity.expenseTotal}
            incomeTotal={activity.incomeTotal}
            currency={defaultCurrency}
          />
        </div>
        <FilterResultsAnnouncer
          count={activity.filteredRows.length}
          active={activity.hasActiveFilters}
        />
        <div className="mt-4">
          <ActivityFeed
            transactions={activity.filteredRows}
            currency={defaultCurrency}
            isHistoryPending={isPendingHistory(
              isHistoryLoaded,
              activity.effectivePeriod,
              activity.selectedMonth,
            )}
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
