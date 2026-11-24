import { useTranslation } from 'react-i18next';
import CheckCheck from 'lucide-react/dist/esm/icons/check-check';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import { Button } from '@/common/ui/button';

const ReviewQueueActions = ({
  isVisible,
  hasNextPage,
  isReviewing,
  selectedIds,
  onSelectAll,
  onReview,
}: {
  isVisible: boolean;
  hasNextPage: boolean;
  isReviewing: boolean;
  selectedIds: ReadonlySet<string>;
  onSelectAll: () => void;
  onReview: (ids: string[]) => Promise<void>;
}) => {
  const { t } = useTranslation();
  if (isVisible) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isReviewing}
          onClick={onSelectAll}
        >
          <ListChecks className="mr-2 h-4 w-4" />
          {t(getSelectLabelKey(hasNextPage))}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={0 === selectedIds.size || isReviewing}
          onClick={() => void onReview([...selectedIds])}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          {t('review.reviewSelected', { count: selectedIds.size })}
        </Button>
      </div>
    );
  } else {
    return null;
  }
};

export default ReviewQueueActions;

const getSelectLabelKey = (hasNextPage: boolean): string => {
  if (hasNextPage) {
    return 'review.selectLoaded';
  } else {
    return 'review.selectAll';
  }
};
