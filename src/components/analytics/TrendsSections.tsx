import { useTranslation } from 'react-i18next';
import SpendingInsights from '@/components/analytics/SpendingInsights';
import YearRhythm from '@/components/analytics/YearRhythm';
import ForecastSection from '@/components/analytics/ForecastSection';
import CategoryBreakdownSection from '@/components/analytics/CategoryBreakdownSection';
import ProUpsellCard from '@/components/pro/ProUpsellCard';
import type { useAnalyticsData } from '@/hooks/analytics/useAnalyticsData';
import type { CategoryRow } from '@/hooks/analytics/useAnalyticsData';
import type { Category } from '@/types/Category';

type Props = {
  analytics: ReturnType<typeof useAnalyticsData>;
  isPro: boolean;
  categories: Category[];
  monthlyBudget: number | null;
  defaultCurrency: string;
  onCategoryClick: (category: CategoryRow) => void;
};

// The analysis someone explicitly asked to explore. The overview keeps the
// everyday answers; this route keeps the power without making it the toll.
const TrendsSections = ({
  analytics,
  isPro,
  categories,
  monthlyBudget,
  defaultCurrency,
  onCategoryClick,
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

export default TrendsSections;

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
