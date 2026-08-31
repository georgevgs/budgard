import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import CheckCheck from 'lucide-react/dist/esm/icons/check-check';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import WandSparkles from 'lucide-react/dist/esm/icons/wand-sparkles';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/common/PageHeader';
import SurfaceCard from '@/components/common/SurfaceCard';
import TransactionRuleDialog from '@/components/review/TransactionRuleDialog';
import { useCategoriesData, useDataConfig } from '@/contexts/DataContext';
import { useTransactionReviewOps } from '@/hooks/dataOps/useTransactionReviewOps';
import { formatCurrency } from '@/lib/utils';
import type { Expense } from '@/types/Expense';

const ReviewQueueView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { defaultCurrency } = useDataConfig();
  const { categories } = useCategoriesData();
  const review = useTransactionReviewOps();
  const [ruleTransaction, setRuleTransaction] = useState<Expense | null>(null);

  return (
    <div className="page-shell pb-12">
      <PageHeader
        title={t('review.title')}
        subtitle={t('review.subtitle', { count: review.pending.length })}
      />
      <div className="mt-6 space-y-3">
        {renderQueueActions(review, t)}
        {renderQueue(review, defaultCurrency, setRuleTransaction, navigate, t)}
      </div>
      {renderRuleDialog(ruleTransaction, categories, review, setRuleTransaction)}
    </div>
  );
};

export default ReviewQueueView;

// --- Helpers ---

type Review = ReturnType<typeof useTransactionReviewOps>;
type TFunc = ReturnType<typeof useTranslation>['t'];
type Navigate = ReturnType<typeof useNavigate>;
type CategoryList = ReturnType<typeof useCategoriesData>['categories'];

const renderQueueActions = (review: Review, t: TFunc) => {
  if (review.pending.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button type="button" size="sm" variant="ghost" onClick={review.selectAll}>
        <ListChecks className="mr-2 h-4 w-4" />
        {t('review.selectAll')}
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={review.selectedIds.size === 0}
        onClick={() => void review.markReviewed([...review.selectedIds])}
      >
        <CheckCheck className="mr-2 h-4 w-4" />
        {t('review.reviewSelected', { count: review.selectedIds.size })}
      </Button>
    </div>
  );
};

const renderQueue = (
  review: Review,
  currency: string,
  setRuleTransaction: (transaction: Expense) => void,
  navigate: Navigate,
  t: TFunc,
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
  t: TFunc,
) => {
  const checked = review.selectedIds.has(transaction.id);

  return (
    <article key={transaction.id} className="p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-border accent-primary"
          checked={checked}
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
          onClick={() => void review.markReviewed([transaction.id])}
        >
          {t('review.looksRight')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setRuleTransaction(transaction)}
        >
          <WandSparkles className="mr-2 h-4 w-4" />
          {t('review.teach')}
        </Button>
      </div>
    </article>
  );
};

const renderRawDescription = (transaction: Expense, t: TFunc) => {
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

const getRowMetadata = (transaction: Expense, t: TFunc): string => {
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
