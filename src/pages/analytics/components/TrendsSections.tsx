import { useTranslation } from 'react-i18next';
import { SpendingInsights } from '@/pages/analytics/components/SpendingInsights';
import { YearRhythm } from '@/pages/analytics/components/YearRhythm';
import { ForecastSection } from '@/pages/analytics/components/ForecastSection';
import { CategoryBreakdownSection } from '@/pages/analytics/components/CategoryBreakdownSection';
import { ProUpsellCard } from '@/pages/pro/components/ProUpsellCard';
import type { useAnalyticsData } from '@/pages/analytics/hooks/useAnalyticsData';
import type { CategoryRow } from '@/pages/analytics/hooks/useAnalyticsData';
import type { Category } from '@/types/Category';

type TrendsSectionsProps = {
  analytics: ReturnType<typeof useAnalyticsData>;
  isPro: boolean;
  categories: Category[];
  monthlyBudget: number | null;
  defaultCurrency: string;
  onCategoryClick: (category: CategoryRow) => void;
};

// The analysis someone explicitly asked to explore. The overview keeps the
// everyday answers; this route keeps the power without making it the toll.
export const TrendsSections = ({
  analytics,
  isPro,
  categories,
  monthlyBudget,
  defaultCurrency,
  onCategoryClick,
}: TrendsSectionsProps) => {
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

      <YearRhythm months={analytics.rhythmMonths} currency={defaultCurrency} />

      <CategoryBreakdownSection
        breakdown={analytics.yearlyStats.categoryBreakdown}
        totalSpent={analytics.yearlyStats.totalSpent}
        selectedYear={analytics.selectedYear}
        currency={defaultCurrency}
        onCategoryClick={onCategoryClick}
      />

      {renderForecast(isPro, t)}
    </div>
  );
};
// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

// The forecast needs more than the free plan's short window to project from,
// so free users get an upsell card in its place.
const renderForecast = (isPro: boolean, t: TFunc) => {
  if (!isPro) {
    return (
      <ProUpsellCard
        title={t('pro.gate.forecastTitle')}
        description={t('pro.gate.forecastBody')}
      />
    );
  }

  return <ForecastSection />;
};
