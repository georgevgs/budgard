import { useTranslation } from 'react-i18next';
import AnalyticsDrillDownDialogs from '@/components/analytics/AnalyticsDrillDownDialogs';
import AnalyticsEmpty from '@/components/analytics/AnalyticsEmpty';
import TrendsBento from '@/components/analytics/TrendsBento';
import TrendsDeepDiveLoadingState from '@/components/analytics/TrendsDeepDiveLoading';
import TrendsSections from '@/components/analytics/TrendsSections';
import YearPill from '@/components/analytics/YearPill';
import PageHeader from '@/components/common/PageHeader';
import {
  useCategoriesData,
  useDataConfig,
  useExpensesData,
} from '@/contexts/DataContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAnalyticsData } from '@/hooks/analytics/useAnalyticsData';
import { useAnalyticsDrillDown } from '@/hooks/analytics/useAnalyticsDrillDown';
import { useCurrentDate } from '@/hooks/useCurrentDate';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';

const TrendsDeepDiveView = () => {
  const { t } = useTranslation();
  const { isPro } = useSubscription();
  const { expenseCategories: categories } = useCategoriesData();
  const { monthlyBudget, defaultCurrency, isInitialized } = useDataConfig();
  const allExpenses = useExpensesData();
  const now = useCurrentDate();
  const analytics = useAnalyticsData(now);
  const drillDown = useAnalyticsDrillDown(
    analytics.yearExpenses,
    analytics.selectedYear,
  );
  const showSkeleton = useDelayedLoading(!isInitialized);

  if (!isInitialized) {
    return renderLoading(showSkeleton);
  }
  if (allExpenses.length === 0) {
    return (
      <AnalyticsEmpty
        title={t('analytics.explore.title')}
        subtitle={t('analytics.explore.description')}
      />
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        title={t('analytics.explore.title')}
        subtitle={t('analytics.explore.description')}
        action={
          <YearPill
            selectedYear={analytics.selectedYear}
            availableYears={analytics.availableYears}
            onYearChange={analytics.setSelectedYear}
          />
        }
      />
      <TrendsBento
        monthComparison={analytics.monthComparison}
        rhythmMonths={analytics.rhythmMonths}
        monthlyData={analytics.monthlyData}
        monthlyAverage={analytics.yearlyStats.monthlyAverage}
        monthsElapsed={analytics.yearlyStats.monthsElapsed}
        onMonthClick={drillDown.handleMonthClick}
      />
      <TrendsSections
        analytics={analytics}
        isPro={isPro}
        categories={categories}
        monthlyBudget={monthlyBudget}
        defaultCurrency={defaultCurrency}
        onCategoryClick={drillDown.handleCategoryClick}
      />
      <AnalyticsDrillDownDialogs
        drillDown={drillDown}
        expenses={analytics.yearExpenses}
        categories={categories}
      />
    </div>
  );
};

export default TrendsDeepDiveView;

// --- Helpers ---

const renderLoading = (showSkeleton: boolean) => {
  if (!showSkeleton) {
    return null;
  }

  return <TrendsDeepDiveLoadingState />;
};
