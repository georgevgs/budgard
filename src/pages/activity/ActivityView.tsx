import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ReceiptText from 'lucide-react/dist/esm/icons/receipt-text';
import { PageHeader } from '@/common/components/common/PageHeader';
import { EmptyStateCard } from '@/common/ui/empty-state-card';
import { ActivityHistoryError } from '@/pages/activity/components/ActivityHistoryError';
import { ActivityFeed } from '@/pages/activity/components/ActivityFeed';
import { ActivityToolbar } from '@/pages/activity/components/ActivityToolbar';
import { ActivitySummary } from '@/pages/activity/components/ActivitySummary';
import { ActivityFilterPanel } from '@/pages/activity/components/ActivityFilterPanel';
import { ActivityToolsMenu } from '@/pages/activity/components/ActivityToolsMenu';
import { ReviewQueueBanner } from '@/pages/activity/components/ReviewQueueBanner';
import { FilterResultsAnnouncer } from '@/pages/activity/components/FilterResultsAnnouncer';
import { TransactionsLoading } from '@/common/components/common/TransactionsLoading';
import {
  useCategoriesData,
  useDataActions,
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
import { useSeedIncomeCategories } from '@/pages/activity/hooks/useSeedIncomeCategories';
import { isMonthPendingHistory } from '@/constants/dataCache';

const ActivityView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    isInitialized,
    isHistoryLoaded,
    hasHistoryLoadError,
    defaultCurrency,
  } = useDataConfig();
  const { loadHistory } = useDataActions();
  const { categories } = useCategoriesData();
  const tags = useTagsData();
  const quickAdd = useQuickAdd();
  const now = useCurrentDate();
  const activity = useActivityFeed(quickAdd.optimisticExpenses, now);
  const csvExport = useActivityCsvExport(
    activity.filteredRows,
    activity.exportScope,
  );
  const isHistoryPending =
    (!activity.hasTransactions && !isHistoryLoaded) ||
    isPendingHistory(
      isHistoryLoaded,
      activity.effectivePeriod,
      activity.selectedMonth,
    );
  const showSkeleton = useDelayedLoading(!isInitialized);

  useOnDemandHistory(isHistoryPending);
  useSeedIncomeCategories();

  const toolsMenu = (
    <ActivityToolsMenu
      isExportDisabled={csvExport.isExportDisabled}
      onExport={csvExport.handleExport}
    />
  );

  if (!isInitialized) {
    return renderLoading(showSkeleton);
  }

  if (hasHistoryLoadError && !activity.hasTransactions) {
    return (
      <div className="page-shell">
        <PageHeader title={t('activity.title')} action={toolsMenu} />
        <div className="mt-8">
          <ActivityHistoryError onRetry={() => void loadHistory()} />
        </div>
      </div>
    );
  }

  if (isHistoryLoaded && !activity.hasTransactions) {
    return (
      <div className="page-shell">
        <PageHeader title={t('activity.title')} action={toolsMenu} />
        <div className="mt-8">
          <EmptyStateCard
            variant="page"
            media={
              <ReceiptText className="h-12 w-12 text-muted-foreground/50" />
            }
            title={t('activity.firstUseTitle')}
            description={t('activity.firstUseBody')}
            actionLabel={t('expenses.addExpense')}
            onAction={() => navigate('/today?action=add')}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-shell">
        <PageHeader title={t('activity.title')} action={toolsMenu} />
        {renderHistoryError(hasHistoryLoadError, loadHistory)}
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
        {renderSummary(activity, defaultCurrency)}
        <div className="mt-2">
          <ActivityFeed
            transactions={activity.filteredRows}
            currency={defaultCurrency}
            isHistoryPending={isHistoryPending}
            hasTransactions={activity.hasTransactions}
            hasPeriodRows={activity.periodRows.length > 0}
            onShowAll={activity.showAllActivity}
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

const renderHistoryError = (
  hasHistoryLoadError: boolean,
  loadHistory: () => Promise<void>,
) => {
  if (!hasHistoryLoadError) {
    return null;
  }

  return (
    <div className="mt-3">
      <ActivityHistoryError onRetry={() => void loadHistory()} />
    </div>
  );
};

const renderSummary = (
  activity: ReturnType<typeof useActivityFeed>,
  currency: string,
) => {
  if (activity.filteredRows.length === 0) {
    return null;
  }

  return (
    <div className="mt-3">
      <ActivitySummary
        count={activity.filteredRows.length}
        expenseTotal={activity.expenseTotal}
        incomeTotal={activity.incomeTotal}
        currency={currency}
      />
    </div>
  );
};

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

  return <TransactionsLoading />;
};
