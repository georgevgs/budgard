import { useTranslation } from 'react-i18next';
import WandSparkles from 'lucide-react/dist/esm/icons/wand-sparkles';
import { Button } from '@/common/ui/button';
import ReviewStatementDescription from '@/pages/review/components/ReviewStatementDescription/ReviewStatementDescription';
import { formatCurrency } from '@/constants/utils';
import type { Expense } from '@/types/Expense';

type ReviewTransactionRowProps = {
  transaction: Expense;
  currency: string;
  isChecked: boolean;
  isReviewing: boolean;
  onToggleSelected: () => void;
  onReview: () => void;
  onTeach: () => void;
};

const ReviewTransactionRow = ({
  transaction,
  currency,
  isChecked,
  isReviewing,
  onToggleSelected,
  onReview,
  onTeach,
}: ReviewTransactionRowProps) => {
  const { t } = useTranslation();
  const { amount, category, date, description, merchant_name, type } =
    transaction;
  const merchant = merchant_name ?? description;
  const shouldShowDescription = '' !== merchant && merchant !== description;
  const typeKey = getTypeKey(type);
  const categoryName =
    getCategoryNameOrNull(category) ?? t('review.uncategorized');

  return (
    <article className="p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-border accent-primary"
          checked={isChecked}
          disabled={isReviewing}
          aria-label={t('review.selectTransaction', { merchant })}
          onChange={onToggleSelected}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-semibold">{merchant}</p>
            <p className="shrink-0 text-sm font-semibold">
              {formatCurrency(Math.abs(amount), currency)}
            </p>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('review.rowMetadata', {
              date,
              type: t(typeKey),
              category: categoryName,
            })}
          </p>
          <ReviewStatementDescription
            isVisible={shouldShowDescription}
            description={description}
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isReviewing}
          onClick={onReview}
        >
          {t('review.looksRight')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isReviewing}
          onClick={onTeach}
        >
          <WandSparkles className="mr-2 h-4 w-4" />
          {t('review.teach')}
        </Button>
      </div>
    </article>
  );
};

export default ReviewTransactionRow;

const getCategoryNameOrNull = (
  category: Expense['category'],
): string | null => {
  if (undefined !== category && null !== category) {
    return category.name;
  } else {
    return null;
  }
};

const getTypeKey = (type: Expense['type']): string => {
  if ('income' === type) {
    return 'review.income';
  } else {
    return 'review.expense';
  }
};
