import { useTranslation } from 'react-i18next';
import {
  useDataConfig,
  useCategoriesData,
  useExpensesData,
} from '@/common/contexts/DataContext';
import { AnalyticsLoading } from '@/pages/analytics/components/AnalyticsLoading';
import { useDelayedLoading } from '@/common/hooks/useDelayedLoading';
import { PageHeader } from '@/common/components/common/PageHeader';
import { AnalyticsEmpty } from '@/pages/analytics/components/AnalyticsEmpty';
import { useSubscription } from '@/common/contexts/SubscriptionContext';
import { AnalyticsDrillDownDialogs } from '@/pages/analytics/components/AnalyticsDrillDownDialogs';
import { TrendsOverview } from '@/pages/analytics/components/TrendsOverview';
import { YearPill } from '@/pages/analytics/components/YearPill';
import { useAnalyticsData } from '@/pages/analytics/hooks/useAnalyticsData';
import { useAnalyticsDrillDown } from '@/pages/analytics/hooks/useAnalyticsDrillDown';
import { useMonthlyReview } from '@/pages/analytics/hooks/useMonthlyReview';
import { useCurrentDate } from '@/common/hooks/useCurrentDate';

const AnalyticsView = () => {
  const { t } = useTranslation();
  const { isPro } = useSubscription();
  const { expenseCategories: categories } = useCategoriesData();
  const { monthlyBudget, defaultCurrency, isInitialized } = useDataConfig();
  const allExpenses = useExpensesData();
  const now = useCurrentDate();

  const analytics = useAnalyticsData(now);
  const review = useMonthlyReview({
    expenses: analytics.expenses,
    categories,
    comparison: analytics.monthComparison,
    monthlyBudget,
    currency: defaultCurrency,
    now,
  });
  const drillDown = useAnalyticsDrillDown(
    analytics.yearExpenses,
    analytics.selectedYear,
  );
  const showSkeleton = useDelayedLoading(!isInitialized);

  if (!isInitialized) {
    return renderLoading(showSkeleton);
  }

  // First run: a wall of zeroed charts explains nothing — point the user
  // at adding an expense instead.
  if (allExpenses.length === 0) {
    return <AnalyticsEmpty />;
  }

  return (
    <div className="page-shell">
      <PageHeader
        title={t('navigation.trends')}
        action={
          <YearPill
            selectedYear={analytics.selectedYear}
            availableYears={analytics.availableYears}
            onYearChange={analytics.setSelectedYear}
          />
        }
      />

      <TrendsOverview
        analytics={analytics}
        review={review}
        isPro={isPro}
        onMonthClick={drillDown.handleMonthClick}
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

export default AnalyticsView;

const renderLoading = (showSkeleton: boolean) => {
  if (!showSkeleton) {
    return null;
  }

  return <AnalyticsLoading />;
};
