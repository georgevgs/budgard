import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/common/components/common/PageHeader';
import RetryCard from '@/common/components/common/RetryCard/RetryCard';
import { SurfaceCard } from '@/common/components/common/SurfaceCard';
import {
  useCategoriesData,
  useDataConfig,
} from '@/common/contexts/DataContext';
import { useTransactionReviewOps } from '@/common/hooks/dataOps/useTransactionReviewOps';
import ReviewQueueActions from '@/pages/review/components/ReviewQueueActions/ReviewQueueActions';
import ReviewQueueList from '@/pages/review/components/ReviewQueueList/ReviewQueueList';
import ReviewQueuePagination from '@/pages/review/components/ReviewQueuePagination/ReviewQueuePagination';
import { TransactionRuleDialog } from '@/pages/review/components/TransactionRuleDialog';
import { useReviewQueue } from '@/pages/review/hooks/useReviewQueue';
import type { Expense } from '@/types/Expense';

const ReviewQueueView = () => {
  const { t } = useTranslation();
  const { defaultCurrency, isInitialized } = useDataConfig();
  const { categories } = useCategoriesData();
  const queue = useReviewQueue();
  const review = useTransactionReviewOps(queue.items, queue.refresh);
  const [ruleTransaction, setRuleTransaction] = useState<Expense | null>(null);
  const title = t('review.title');
  const hasError = 'error' === queue.status;
  const isLoading = 'loading' === queue.status || false === isInitialized;
  const hasNextPage = null !== queue.nextCursor;

  if (hasError) {
    return (
      <div className="page-shell pb-12">
        <PageHeader title={title} />
        <div className="mt-6">
          <RetryCard message={t('review.loadFailed')} onRetry={queue.refresh} />
        </div>
      </div>
    );
  } else if (isLoading) {
    return (
      <div className="page-shell pb-12">
        <PageHeader title={title} />
        <SurfaceCard
          role="status"
          className="mt-6 p-4 text-sm text-muted-foreground"
        >
          {t('review.loading')}
        </SurfaceCard>
      </div>
    );
  } else {
    const content = (
      <div className="page-shell pb-12">
        <PageHeader
          title={title}
          subtitle={t('review.subtitle', { count: queue.count })}
        />
        <div className="mt-6 space-y-3" aria-busy={review.isReviewing}>
          <ReviewQueueActions
            isVisible={0 < queue.items.length}
            hasNextPage={hasNextPage}
            isReviewing={review.isReviewing}
            selectedIds={review.selectedIds}
            onSelectAll={review.selectAll}
            onReview={review.markReviewed}
          />
          <ReviewQueueList
            items={queue.items}
            currency={defaultCurrency}
            isReviewing={review.isReviewing}
            selectedIds={review.selectedIds}
            onToggleSelected={review.toggleSelected}
            onReview={review.markReviewed}
            onTeach={(transaction) => setRuleTransaction(transaction)}
          />
          <ReviewQueuePagination
            hasNextPage={hasNextPage}
            isLoading={'loadingMore' === queue.status}
            hasError={'moreError' === queue.status}
            isReviewing={review.isReviewing}
            onLoadMore={queue.loadMore}
          />
        </div>
      </div>
    );

    if (null !== ruleTransaction) {
      return (
        <>
          {content}
          <TransactionRuleDialog
            transaction={ruleTransaction}
            categories={categories}
            onSave={(draft) => review.teachRule(ruleTransaction.id, draft)}
            onClose={() => setRuleTransaction(null)}
          />
        </>
      );
    } else {
      return <>{content}</>;
    }
  }
};

export default ReviewQueueView;
