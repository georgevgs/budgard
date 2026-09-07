import { useTranslation } from 'react-i18next';
import { AnalyticsDrillDownDialogs } from '@/pages/analytics/components/AnalyticsDrillDownDialogs';
import { AnalyticsEmpty } from '@/pages/analytics/components/AnalyticsEmpty';
import { TrendsBento } from '@/pages/analytics/components/TrendsBento';
import { TrendsDeepDiveLoading } from '@/pages/analytics/components/TrendsDeepDiveLoading';
import { TrendsSections } from '@/pages/analytics/components/TrendsSections';
import { YearPill } from '@/pages/analytics/components/YearPill';
import { PageHeader } from '@/common/components/common/PageHeader';
import {
  useCategoriesData,
  useDataConfig,
  useExpensesData,
} from '@/common/contexts/DataContext';
import { useSubscription } from '@/common/contexts/SubscriptionContext';
import { useAnalyticsData } from '@/pages/analytics/hooks/useAnalyticsData';
import { useAnalyticsDrillDown } from '@/pages/analytics/hooks/useAnalyticsDrillDown';
import { useCurrentDate } from '@/common/hooks/useCurrentDate';
import { useDelayedLoading } from '@/common/hooks/useDelayedLoading';

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

const renderLoading = (showSkeleton: boolean) => {
  if (!showSkeleton) {
    return null;
  }

  return <TrendsDeepDiveLoading />;
};
