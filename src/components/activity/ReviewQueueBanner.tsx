import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import { useExpensesData, useIncomesData } from '@/contexts/DataContext';

const ReviewQueueBanner = () => {
  const { t } = useTranslation();
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const pendingCount = countPending(expenses) + countPending(incomes);
  if (pendingCount === 0) {
    return null;
  }

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
          {t('review.bannerTitle', { count: pendingCount })}
        </span>
        <span className="block text-xs text-muted-foreground">
          {t('review.bannerDescription')}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
};

export default ReviewQueueBanner;

// --- Helpers ---

const countPending = (transactions: { review_status?: string }[]): number =>
  transactions.filter((transaction) => transaction.review_status === 'pending')
    .length;
