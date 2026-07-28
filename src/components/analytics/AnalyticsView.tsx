import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import {
  useDataConfig,
  useCategoriesData,
  useExpensesData,
} from '@/contexts/DataContext';
import AnalyticsLoadingState from '@/components/analytics/AnalyticsLoading';
import AnalyticsEmpty from '@/components/analytics/AnalyticsEmpty';
import SpendingInsights from '@/components/analytics/SpendingInsights';
import CategorySparkline from '@/components/analytics/CategorySparkline';
import { CategoryDrillDown } from '@/components/analytics/CategoryDrillDown';
import { MonthDrillDown } from '@/components/analytics/MonthDrillDown';
import MonthSnapshotCard from '@/components/analytics/MonthSnapshotCard';
import YearOverviewSection from '@/components/analytics/YearOverviewSection';
import CashFlowSection from '@/components/analytics/CashFlowSection';
import ForecastSection from '@/components/analytics/ForecastSection';
import AnnualExportCard from '@/components/analytics/AnnualExportCard';
import ProUpsellCard from '@/components/pro/ProUpsellCard';
import { useAnalyticsData } from '@/hooks/analytics/useAnalyticsData';
import { useAnalyticsDrillDown } from '@/hooks/analytics/useAnalyticsDrillDown';
import { useIsPro } from '@/hooks/useIsPro';
import type { CategoryRow } from '@/hooks/analytics/useAnalyticsData';
import { formatCurrency } from '@/lib/utils';
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

  if (!isInitialized) {
    return <AnalyticsLoadingState />;
  }

  // First run: a wall of zeroed charts explains nothing — point the user
  // at adding an expense instead.
  if (allExpenses.length === 0) {
    return <AnalyticsEmpty />;
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 pt-4 pb-4 space-y-6">
      {/* Month snapshot */}
      <MonthSnapshotCard monthComparison={analytics.monthComparison} />

      {/* Spending insights */}
      <SpendingInsights
        expenses={analytics.expenses}
        monthlyBudget={monthlyBudget}
        monthComparison={analytics.monthComparison}
        categories={categories}
        defaultCurrency={defaultCurrency}
      />

      {/* Year overview */}
      <YearOverviewSection
        selectedYear={analytics.selectedYear}
        availableYears={analytics.availableYears}
        onYearChange={analytics.setSelectedYear}
        monthlyData={analytics.monthlyData}
        yAxisMax={analytics.yAxisMax}
        totalSpent={analytics.yearlyStats.totalSpent}
        monthlyAverage={analytics.yearlyStats.monthlyAverage}
        monthsElapsed={analytics.yearlyStats.monthsElapsed}
        onMonthClick={drillDown.handleMonthClick}
      />

      {renderProSections(isPro, analytics.selectedYear, t)}

      {/* Category breakdown */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">
          {t('analytics.categoryTrends')}
        </h3>
        {renderCategoryBreakdown(
          analytics.yearlyStats.categoryBreakdown,
          analytics.yearlyStats.totalSpent,
          analytics.selectedYear,
          t,
          drillDown.handleCategoryClick,
          defaultCurrency,
        )}
      </div>

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

type TFunc = (key: string, options?: Record<string, unknown>) => string;

// Cash flow and the annual CSV export cover more than the free 3-month
// window, so free users get one upsell card in their place.
const renderProSections = (isPro: boolean, selectedYear: number, t: TFunc) => {
  if (!isPro) {
    return (
      <ProUpsellCard
        title={t('pro.gate.analyticsTitle')}
        description={t('pro.gate.analyticsBody')}
      />
    );
  }

  return (
    <>
      {/* Cash flow (income vs expense, year view) */}
      <CashFlowSection selectedYear={selectedYear} />

      {/* Forecast (12-month projection + safe-to-spend) */}
      <ForecastSection />

      {/* Annual export (CSV download for tax/records) */}
      <AnnualExportCard selectedYear={selectedYear} />
    </>
  );
};

const renderCategoryBreakdown = (
  breakdown: CategoryRow[],
  totalSpent: number,
  selectedYear: number,
  t: TFunc,
  onCategoryClick: (cat: CategoryRow) => void,
  currency: string,
) => {
  if (breakdown.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8 px-4">
        {t('analytics.noCategorizedExpenses', { year: selectedYear })}
      </p>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 divide-y divide-border/40">
        {breakdown.map((cat) => {
          let pct = 0;
          if (totalSpent > 0) {
            pct = (cat.amount / totalSpent) * 100;
          }

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryClick(cat)}
              className="flex items-center gap-4 px-5 py-3.5 w-full text-left transition-colors hover:bg-accent/50 active:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset cursor-pointer"
            >
              {renderCategoryIcon(cat)}
              <span className="flex-1 text-sm font-medium truncate min-w-0">
                {cat.name}
              </span>
              <div className="shrink-0 w-16">
                <CategorySparkline
                  values={cat.monthlyAmounts}
                  color={cat.color}
                />
              </div>
              <span className="text-sm font-semibold tabular-nums shrink-0">
                {formatCurrency(cat.amount, currency)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0">
                {Math.round(pct)}%
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
};

const renderCategoryIcon = (cat: CategoryRow) => {
  if (cat.icon) {
    return <span className="text-base shrink-0">{cat.icon}</span>;
  }

  return (
    <div
      className="w-2.5 h-2.5 rounded-full shrink-0"
      style={{ backgroundColor: cat.color }}
    />
  );
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
