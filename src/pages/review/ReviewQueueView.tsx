import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import CheckCheck from 'lucide-react/dist/esm/icons/check-check';
import WandSparkles from 'lucide-react/dist/esm/icons/wand-sparkles';
import { Button } from '@/common/ui/button';
import { PageHeader } from '@/common/components/common/PageHeader';
import { SurfaceCard } from '@/common/components/common/SurfaceCard';
import { TransactionRuleDialog } from '@/pages/review/components/TransactionRuleDialog';
import {
  useCategoriesData,
  useDataConfig,
} from '@/common/contexts/DataContext';
import { useTransactionReviewOps } from '@/common/hooks/dataOps/useTransactionReviewOps';
import { useReviewQueue } from '@/pages/review/hooks/useReviewQueue';
import ReviewQueuePagination from '@/pages/review/components/ReviewQueuePagination/ReviewQueuePagination';
import ReviewQueueActions from '@/pages/review/components/ReviewQueueActions/ReviewQueueActions';
import { formatCurrency } from '@/constants/utils';
import type { Expense } from '@/types/Expense';
import type { TranslateFunction } from '@/constants/translate';

const ReviewQueueView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { defaultCurrency, isInitialized } = useDataConfig();
  const { categories } = useCategoriesData();
  const queue = useReviewQueue();
  const review = useTransactionReviewOps(queue.items, queue.refresh);
  const [ruleTransaction, setRuleTransaction] = useState<Expense | null>(null);

  const content = (
    <div className="page-shell pb-12">
      <PageHeader
        title={t('review.title')}
        subtitle={t('review.subtitle', { count: queue.count })}
      />
      <div className="mt-6 space-y-3" aria-busy={review.isReviewing}>
        <ReviewQueueActions
          isVisible={0 < queue.items.length}
          hasNextPage={null !== queue.nextCursor}
          isReviewing={review.isReviewing}
          selectedIds={review.selectedIds}
          onSelectAll={review.selectAll}
          onReview={review.markReviewed}
        />
        {renderQueue(review, defaultCurrency, setRuleTransaction, navigate, t)}
        <ReviewQueuePagination
          hasNextPage={null !== queue.nextCursor}
          isLoading={'loadingMore' === queue.status}
          hasError={'moreError' === queue.status}
          isReviewing={review.isReviewing}
          onLoadMore={queue.loadMore}
        />
      </div>
      {renderRuleDialog(
        ruleTransaction,
        categories,
        review,
        setRuleTransaction,
      )}
    </div>
  );

  if ('error' === queue.status) {
    return (
      <div className="page-shell pb-12">
        <PageHeader title={t('review.title')} />
        <SurfaceCard role="alert" className="mt-6 space-y-3 p-4">
          <p className="text-sm">{t('review.loadFailed')}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void queue.refresh()}
          >
            {t('common.tryAgain')}
          </Button>
        </SurfaceCard>
      </div>
    );
  } else if ('loading' === queue.status || false === isInitialized) {
    return (
      <div className="page-shell pb-12">
        <PageHeader title={t('review.title')} />
        <SurfaceCard
          role="status"
          className="mt-6 p-4 text-sm text-muted-foreground"
        >
          {t('review.loading')}
        </SurfaceCard>
      </div>
    );
  } else {
    return content;
  }
};

export default ReviewQueueView;

type Review = ReturnType<typeof useTransactionReviewOps>;
type Navigate = ReturnType<typeof useNavigate>;
type CategoryList = ReturnType<typeof useCategoriesData>['categories'];

const renderQueue = (
  review: Review,
  currency: string,
  setRuleTransaction: (transaction: Expense) => void,
  navigate: Navigate,
  t: TranslateFunction,
) => {
  if (review.pending.length === 0) {
    return (
      <SurfaceCard>
        <div className="p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-primary-ink">
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

  return (
    <div className="surface-card-flush divide-y divide-border/40">
      {review.pending.map((transaction) =>
        renderTransactionRow(
          transaction,
          currency,
          review,
          setRuleTransaction,
          t,
        ),
      )}
    </div>
  );
};

const renderTransactionRow = (
  transaction: Expense,
  currency: string,
  review: Review,
  setRuleTransaction: (transaction: Expense) => void,
  t: TranslateFunction,
) => {
  const isChecked = review.selectedIds.has(transaction.id);

  return (
    <article key={transaction.id} className="p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-border accent-primary"
          checked={isChecked}
          disabled={review.isReviewing}
          aria-label={t('review.selectTransaction', {
            merchant: getMerchant(transaction),
          })}
          onChange={() => review.toggleSelected(transaction.id)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-semibold">
              {getMerchant(transaction)}
            </p>
            <p className="shrink-0 text-sm font-semibold">
              {formatCurrency(Math.abs(transaction.amount), currency)}
            </p>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {getRowMetadata(transaction, t)}
          </p>
          {renderRawDescription(transaction, t)}
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={review.isReviewing}
          onClick={() => void review.markReviewed([transaction.id])}
        >
          {t('review.looksRight')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={review.isReviewing}
          onClick={() => setRuleTransaction(transaction)}
        >
          <WandSparkles className="mr-2 h-4 w-4" />
          {t('review.teach')}
        </Button>
      </div>
    </article>
  );
};

const renderRawDescription = (transaction: Expense, t: TranslateFunction) => {
  if (!transaction.merchant_name) {
    return null;
  }
  if (transaction.merchant_name === transaction.description) {
    return null;
  }

  return (
    <p className="mt-1 truncate text-[11px] text-muted-foreground">
      {t('review.statementSaid', { description: transaction.description })}
    </p>
  );
};

const renderRuleDialog = (
  transaction: Expense | null,
  categories: CategoryList,
  review: Review,
  setTransaction: (transaction: Expense | null) => void,
) => {
  if (!transaction) {
    return null;
  }

  return (
    <TransactionRuleDialog
      transaction={transaction}
      categories={categories}
      onSave={(draft) => review.teachRule(transaction.id, draft)}
      onClose={() => setTransaction(null)}
    />
  );
};

const getMerchant = (transaction: Expense): string =>
  transaction.merchant_name ?? transaction.description;

const getRowMetadata = (transaction: Expense, t: TranslateFunction): string => {
  const typeKey = getTypeKey(transaction);
  const category = transaction.category?.name ?? t('review.uncategorized');

  return t('review.rowMetadata', {
    date: transaction.date,
    type: t(typeKey),
    category,
  });
};

const getTypeKey = (transaction: Expense): string => {
  if (transaction.type === 'income') {
    return 'review.income';
  }

  return 'review.expense';
};
