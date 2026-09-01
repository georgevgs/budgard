import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import ChartSpline from 'lucide-react/dist/esm/icons/chart-spline';
import BentoGrid from '@/components/bento/BentoGrid';
import CashFlowSection from '@/components/analytics/CashFlowSection';
import MonthlyReview from '@/components/analytics/MonthlyReview';
import WhereItWentTile from '@/components/analytics/tiles/WhereItWentTile';
import type { useAnalyticsData } from '@/hooks/analytics/useAnalyticsData';
import type { useMonthlyReview } from '@/hooks/analytics/useMonthlyReview';

type Props = {
  analytics: ReturnType<typeof useAnalyticsData>;
  review: ReturnType<typeof useMonthlyReview>;
  isPro: boolean;
  onMonthClick: (index: number) => void;
  onCategoryClick: (
    category: ReturnType<
      typeof useAnalyticsData
    >['yearlyStats']['categoryBreakdown'][number],
  ) => void;
};

// Trends opens with a conclusion, one movement chart and one composition
// answer. Everything analytical beyond those three jobs lives one level down.
const TrendsOverview = (props: Props) => {
  const { t } = useTranslation();
  const stats = props.analytics.yearlyStats;

  return (
    <div className="mt-4 space-y-7">
      <MonthlyReview label={props.review.label} items={props.review.items} />
      <CashFlowSection
        selectedYear={props.analytics.selectedYear}
        isPro={props.isPro}
        monthlyData={props.analytics.monthlyData}
        yAxisMax={props.analytics.yAxisMax}
        totalSpent={stats.totalSpent}
        monthlyAverage={stats.monthlyAverage}
        monthsElapsed={stats.monthsElapsed}
        onMonthClick={props.onMonthClick}
      />
      <BentoGrid>
        <WhereItWentTile
          breakdown={stats.categoryBreakdown}
          totalSpent={stats.totalSpent}
          onCategoryClick={props.onCategoryClick}
        />
      </BentoGrid>
      <Link
        to="/trends/explore"
        viewTransition
        className="surface-card group flex min-h-20 items-center gap-3.5 p-4 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary-ink">
          <ChartSpline className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block type-heading">
            {t('analytics.explore.title')}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            {t('analytics.explore.description')}
          </span>
        </span>
        <ArrowRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
};

export default TrendsOverview;
