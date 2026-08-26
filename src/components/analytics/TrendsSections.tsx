import { useTranslation } from 'react-i18next';
import SpendingInsights from '@/components/analytics/SpendingInsights';
import CategorySparkline from '@/components/analytics/CategorySparkline';
import CategoryIcon from '@/components/common/CategoryIcon';
import YearOverviewSection from '@/components/analytics/YearOverviewSection';
import YearRhythm from '@/components/analytics/YearRhythm';
import CashFlowSection from '@/components/analytics/CashFlowSection';
import ForecastSection from '@/components/analytics/ForecastSection';
import AnnualExportCard from '@/components/analytics/AnnualExportCard';
import ProUpsellCard from '@/components/pro/ProUpsellCard';
import { formatCurrency } from '@/lib/utils';
import { getColorTint } from '@/lib/categoryColor';
import type { useAnalyticsData } from '@/hooks/analytics/useAnalyticsData';
import type { useAnalyticsDrillDown } from '@/hooks/analytics/useAnalyticsDrillDown';
import type { CategoryRow } from '@/hooks/analytics/useAnalyticsData';
import type { Category } from '@/types/Category';

type Props = {
  analytics: ReturnType<typeof useAnalyticsData>;
  drillDown: ReturnType<typeof useAnalyticsDrillDown>;
  isPro: boolean;
  categories: Category[];
  monthlyBudget: number | null;
  defaultCurrency: string;
};

// Everything under the bento: the detail behind the tiles above it. Split out
// of AnalyticsView so the view stays a page layout rather than a page.
const TrendsSections = ({
  analytics,
  drillDown,
  isPro,
  categories,
  monthlyBudget,
  defaultCurrency,
}: Props) => {
  const { t } = useTranslation();

  return (
    <div className="mt-8 space-y-7">
      <SpendingInsights
        expenses={analytics.expenses}
        monthlyBudget={monthlyBudget}
        monthComparison={analytics.monthComparison}
        categories={categories}
        defaultCurrency={defaultCurrency}
      />

      <YearOverviewSection
        monthlyData={analytics.monthlyData}
        yAxisMax={analytics.yAxisMax}
        totalSpent={analytics.yearlyStats.totalSpent}
        monthlyAverage={analytics.yearlyStats.monthlyAverage}
        monthsElapsed={analytics.yearlyStats.monthsElapsed}
        onMonthClick={drillDown.handleMonthClick}
      />

      {/* Placed right after the year overview: the bars above answer "how much
          each month", and this answers "compared to what" — which is the
          question the bars invite and cannot settle on their own. */}
      <YearRhythm months={analytics.rhythmMonths} currency={defaultCurrency} />

      <div className="space-y-3">
        <h2 className="type-heading">{t('analytics.categoryTrends')}</h2>
        {renderCategoryBreakdown(
          analytics.yearlyStats.categoryBreakdown,
          analytics.yearlyStats.totalSpent,
          analytics.selectedYear,
          t,
          drillDown.handleCategoryClick,
          defaultCurrency,
        )}
      </div>

      {renderProSections(isPro, analytics.selectedYear, t)}
    </div>
  );
};

export default TrendsSections;

// --- Helpers ---

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
      <CashFlowSection selectedYear={selectedYear} />
      <ForecastSection />
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
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        {t('analytics.noCategorizedExpenses', { year: selectedYear })}
      </p>
    );
  }

  return (
    <div className="tile overflow-hidden">
      <div className="divide-y divide-border/40 p-0">
        {breakdown.map((cat) =>
          renderCategoryRow(cat, totalSpent, onCategoryClick, currency),
        )}
      </div>
    </div>
  );
};

const renderCategoryRow = (
  cat: CategoryRow,
  totalSpent: number,
  onCategoryClick: (cat: CategoryRow) => void,
  currency: string,
) => {
  let pct = 0;
  if (totalSpent > 0) {
    pct = (cat.amount / totalSpent) * 100;
  }

  return (
    <button
      key={cat.id}
      type="button"
      onClick={() => onCategoryClick(cat)}
      className="flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/50 active:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-4 sm:px-5"
    >
      {renderCategoryIcon(cat)}
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {cat.name}
      </span>
      <div className="hidden w-16 shrink-0 sm:block">
        <CategorySparkline values={cat.monthlyAmounts} color={cat.color} />
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        {formatCurrency(cat.amount, currency)}
      </span>
      <span className="hidden w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground md:block">
        {Math.round(pct)}%
      </span>
    </button>
  );
};

const renderCategoryIcon = (cat: CategoryRow) => {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: getColorTint(cat.color) }}
    >
      <CategoryIcon
        icon={cat.icon}
        className="h-3.5 w-3.5 text-foreground/75"
      />
    </span>
  );
};
