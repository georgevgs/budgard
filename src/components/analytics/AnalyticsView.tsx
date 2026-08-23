import { useTranslation } from 'react-i18next';
import {
  useDataConfig,
  useCategoriesData,
  useExpensesData,
} from '@/contexts/DataContext';
import AnalyticsLoadingState from '@/components/analytics/AnalyticsLoading';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import PageHeader from '@/components/common/PageHeader';
import AnalyticsEmpty from '@/components/analytics/AnalyticsEmpty';
import { useIsPro } from '@/hooks/useIsPro';
import { CategoryDrillDown } from '@/components/analytics/CategoryDrillDown';
import { MonthDrillDown } from '@/components/analytics/MonthDrillDown';
import TrendsBento from '@/components/analytics/TrendsBento';
import TrendsSections from '@/components/analytics/TrendsSections';
import YearPill from '@/components/analytics/YearPill';
import { useAnalyticsData } from '@/hooks/analytics/useAnalyticsData';
import { useAnalyticsDrillDown } from '@/hooks/analytics/useAnalyticsDrillDown';
import type { CategoryRow } from '@/hooks/analytics/useAnalyticsData';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

const AnalyticsView = () => {
  const { t } = useTranslation();
  const isPro = useIsPro();
  const { expenseCategories: categories } = useCategoriesData();
  const { monthlyBudget, defaultCurrency, isInitialized } = useDataConfig();
  const allExpenses = useExpensesData();

  const analytics = useAnalyticsData();
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
    return (
      <>
        <h1 className="sr-only">{t('navigation.trends')}</h1>
        <AnalyticsEmpty />
      </>
    );
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

      {/* The five answers the screen is opened for, above any chart. */}
      <TrendsBento
        monthComparison={analytics.monthComparison}
        rhythmMonths={analytics.rhythmMonths}
        monthlyData={analytics.monthlyData}
        monthlyAverage={analytics.yearlyStats.monthlyAverage}
        monthsElapsed={analytics.yearlyStats.monthsElapsed}
        totalSpent={analytics.yearlyStats.totalSpent}
        breakdown={analytics.yearlyStats.categoryBreakdown}
        onMonthClick={drillDown.handleMonthClick}
        onCategoryClick={drillDown.handleCategoryClick}
      />

      <TrendsSections
        analytics={analytics}
        drillDown={drillDown}
        isPro={isPro}
        categories={categories}
        monthlyBudget={monthlyBudget}
        defaultCurrency={defaultCurrency}
      />

      {/* Drill-down dialogs */}
      {renderCategoryDrillDown(
        drillDown.drillDownCategory,
        drillDown.drillDownCategoryExpenses,
        drillDown.handleCategoryDrillDownClose,
      )}
      {renderMonthDrillDown(
        drillDown.drillDownMonthKey,
        analytics.yearExpenses,
        categories,
        drillDown.handleMonthDrillDownClose,
      )}
    </div>
  );
};

export default AnalyticsView;

// ─── Helper render functions ──────────────────────────────────────────────────

const renderLoading = (showSkeleton: boolean) => {
  if (!showSkeleton) {
    return null;
  }

  return <AnalyticsLoadingState />;
};

const renderCategoryDrillDown = (
  category: CategoryRow | null,
  expenses: Expense[],
  onClose: () => void,
) => {
  if (!category) return null;

  return (
    <CategoryDrillDown
      isOpen={true}
      onClose={onClose}
      categoryName={category.name}
      categoryColor={category.color}
      expenses={expenses}
      totalAmount={category.amount}
    />
  );
};

const renderMonthDrillDown = (
  monthKey: string | null,
  expenses: Expense[],
  categories: Category[],
  onClose: () => void,
) => {
  if (!monthKey) return null;

  return (
    <MonthDrillDown
      isOpen={true}
      onClose={onClose}
      monthKey={monthKey}
      expenses={expenses}
      categories={categories}
    />
  );
};
