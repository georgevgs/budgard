import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import CheckCheck from 'lucide-react/dist/esm/icons/check-check';
import { SurfaceCard } from '@/common/components/common/SurfaceCard';
import { Button } from '@/common/ui/button';
import ReviewTransactionRow from '@/pages/review/components/ReviewTransactionRow/ReviewTransactionRow';
import type { Expense } from '@/types/Expense';

type ReviewQueueListProps = {
  items: Expense[];
  currency: string;
  isReviewing: boolean;
  selectedIds: ReadonlySet<string>;
  onToggleSelected: (id: string) => void;
  onReview: (ids: string[]) => Promise<void>;
  onTeach: (transaction: Expense) => void;
};

const ReviewQueueList = ({
  items,
  currency,
  isReviewing,
  selectedIds,
  onToggleSelected,
  onReview,
  onTeach,
}: ReviewQueueListProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (0 < items.length) {
    return (
      <div className="surface-card-flush divide-y divide-border/40">
        {items.map((transaction) => (
          <ReviewTransactionRow
            key={transaction.id}
            transaction={transaction}
            currency={currency}
            isChecked={selectedIds.has(transaction.id)}
            isReviewing={isReviewing}
            onToggleSelected={() => onToggleSelected(transaction.id)}
            onReview={() => void onReview([transaction.id])}
            onTeach={() => onTeach(transaction)}
          />
        ))}
      </div>
    );
  } else {
    return (
      <SurfaceCard>
        <div className="p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
            <CheckCheck className="h-5 w-5" />
          </span>
          <p className="mt-4 text-sm font-semibold">{t('review.empty')}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('review.emptyDescription')}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-5"
            onClick={() => navigate('/activity', { viewTransition: true })}
          >
            {t('review.backToActivity')}
          </Button>
        </div>
      </SurfaceCard>
    );
  }
};

export default ReviewQueueList;
