import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { SurfaceCard } from '@/common/components/common/SurfaceCard';
import { Button } from '@/common/ui/button';
import ReviewTransactionRow from '@/pages/review/components/ReviewTransactionRow/ReviewTransactionRow';
import type { Expense } from '@/types/Expense';
import Emoji3D from '@/common/components/common/Emoji3D/Emoji3D';

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
          <Emoji3D emoji="✅" className="mx-auto h-14 w-14" />
          <p className="mt-4 text-sm font-semibold">{t('review.empty')}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('review.emptyDescription')}
          </p>
          <Button
            type="button"
            variant="secondary"
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
