import { useTranslation } from 'react-i18next';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { Insight } from '@/hooks/useSpendingInsights';

type Props = {
  insights: Insight[];
};

const TodayInsightList = ({ insights }: Props) => {
  const { t } = useTranslation();

  if (insights.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="today-insights-title">
      <div className="mb-3 flex items-center justify-between">
        <h2
          id="today-insights-title"
          className="font-display text-xl font-semibold"
        >
          {t('today.insights.title')}
        </h2>
        <Link
          to="/trends"
          viewTransition
          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('today.insights.viewTrends')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="surface-card-flush">
        {insights.map((insight, index) => renderInsight(insight, index))}
      </div>
    </section>
  );
};

export default TodayInsightList;

// --- Helpers ---

const renderInsight = (insight: Insight, index: number) => {
  const Icon = insight.icon;

  return (
    <div
      key={insight.id}
      className={cn('flex items-start gap-3 px-4 py-4', getDividerClass(index))}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          getIconClass(insight.variant),
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="pt-1.5 text-sm leading-relaxed text-foreground/82">
        {insight.text}
      </p>
    </div>
  );
};

const getDividerClass = (index: number): string => {
  if (index > 0) {
    return 'border-t border-border/30';
  }

  return '';
};

const getIconClass = (variant: Insight['variant']): string => {
  if (variant === 'positive') {
    return 'bg-income/12 text-income';
  }
  if (variant === 'warning') {
    return 'bg-warning/14 text-warning-foreground';
  }

  return 'bg-primary/12 text-primary';
};
