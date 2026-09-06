import { useTranslation } from 'react-i18next';
import PageHeader from '@/common/components/common/PageHeader';
import ActivityFeed from '@/pages/activity/components/ActivityFeed';
import ActivityToolbar from '@/pages/activity/components/ActivityToolbar';
import ActivitySummary from '@/pages/activity/components/ActivitySummary';
import ActivityFilterPanel from '@/pages/activity/components/ActivityFilterPanel';
import ActivityToolsMenu from '@/pages/activity/components/ActivityToolsMenu';
import ReviewQueueBanner from '@/pages/activity/components/ReviewQueueBanner';
import FilterResultsAnnouncer from '@/pages/expenses/components/FilterResultsAnnouncer';
import { ExpenseLoadingState } from '@/pages/expenses/components/ExpensesLoading';
import {
  useCategoriesData,
  useDataConfig,
  useTagsData,
} from '@/common/contexts/DataContext';
import { useQuickAdd } from '@/common/contexts/QuickAddContext';
import {
  useActivityFeed,
  type ActivityPeriod,
} from '@/pages/activity/hooks/useActivityFeed';
import { useActivityCsvExport } from '@/pages/activity/hooks/useActivityCsvExport';
import { useDelayedLoading } from '@/common/hooks/useDelayedLoading';
import { useCurrentDate } from '@/common/hooks/useCurrentDate';
import { useOnDemandHistory } from '@/common/hooks/data/useOnDemandHistory';
import { useSeedIncomeCategories } from '@/pages/income/hooks/useSeedIncomeCategories';
import { isMonthPendingHistory } from '@/constants/dataCache';

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
  const isHistoryPending = isPendingHistory(
    isHistoryLoaded,
    activity.effectivePeriod,
    activity.selectedMonth,
  );
  const showSkeleton = useDelayedLoading(!isInitialized);

  useOnDemandHistory(isHistoryPending);
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
        <div className="mt-3">
          <ReviewQueueBanner />
        </div>
        <ActivityToolbar
          search={activity.search}
          isSearchingAllTime={activity.isSearchingAllTime}
          onSearchChange={activity.setSearch}
          period={activity.effectivePeriod}
          selectedMonth={activity.selectedMonth}
          onMonthChange={activity.setSelectedMonth}
          filterPanel={
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
        <FilterResultsAnnouncer
          count={activity.filteredRows.length}
          active={activity.hasActiveFilters}
        />
        <div className="mt-3">
          <ActivitySummary
            count={activity.filteredRows.length}
            expenseTotal={activity.expenseTotal}
            incomeTotal={activity.incomeTotal}
            currency={defaultCurrency}
          />
        </div>
        <div className="mt-2">
          <ActivityFeed
            transactions={activity.filteredRows}
            currency={defaultCurrency}
            isHistoryPending={isHistoryPending}
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
