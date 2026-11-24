import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import { usePendingReviewCount } from '@/pages/activity/hooks/usePendingReviewCount';
import type { TranslateFunction } from '@/constants/translate';

export const ReviewQueueBanner = () => {
  const { t } = useTranslation();
  const pending = usePendingReviewCount();
  const shouldShowBanner =
    'error' === pending.status ||
    ('ready' === pending.status && 0 < pending.count);

  if (shouldShowBanner) {
    return (
      <Link
        to="/review"
        viewTransition
        className="tile flex items-center gap-3 rounded-xl p-3.5 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ListChecks className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            {getTitle(pending, t)}
          </span>
          <span className="block text-xs text-muted-foreground">
            {t('review.bannerDescription')}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    );
  } else {
    return null;
  }
};

const getTitle = (
  pending: ReturnType<typeof usePendingReviewCount>,
  t: TranslateFunction,
): string => {
  if ('ready' === pending.status) {
    return t('review.bannerTitle', { count: pending.count });
  } else {
    return t('review.title');
  }
};
