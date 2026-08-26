import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import SurfaceCard from '@/components/common/SurfaceCard';
import type { MonthlyReviewItem } from '@/hooks/analytics/useMonthlyReview';

type Props = {
  label: string;
  items: MonthlyReviewItem[];
};

const MonthlyReview = ({ label, items }: Props) => {
  const { t } = useTranslation();

  return (
    <section className="mt-8 space-y-3">
      <div>
        <h2 className="type-heading">{t('analytics.review.title')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
      <SurfaceCard className="overflow-hidden">
        <div className="divide-y divide-border/40">
          {items.map((item) => (
            <p key={item.id} className="px-4 py-3.5 text-sm leading-relaxed">
              {item.text}
            </p>
          ))}
          <Link
            to="/activity"
            viewTransition
            className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-primary-ink transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            {t('analytics.review.openActivity')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </SurfaceCard>
    </section>
  );
};

export default MonthlyReview;
