import { useTranslation } from 'react-i18next';
import { Button } from '@/common/ui/button';

export default function ReviewQueuePagination({
  hasNextPage,
  isLoading,
  hasError,
  isReviewing,
  onLoadMore,
}: {
  hasNextPage: boolean;
  isLoading: boolean;
  hasError: boolean;
  isReviewing: boolean;
  onLoadMore: () => void;
}) {
  const { t } = useTranslation();

  if (hasNextPage && hasError) {
    return (
      <div className="space-y-2 text-center" role="alert">
        <p className="text-sm text-muted-foreground">
          {t('review.loadMoreFailed')}
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={isReviewing}
          onClick={onLoadMore}
        >
          {t('common.tryAgain')}
        </Button>
      </div>
    );
  } else if (hasNextPage) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isLoading || isReviewing}
        aria-busy={isLoading}
        onClick={onLoadMore}
      >
        {t('review.loadMore')}
      </Button>
    );
  } else {
    return null;
  }
}
