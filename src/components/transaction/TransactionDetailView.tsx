import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { useDataConfig } from '@/contexts/DataContext';
import { useQuickAdd } from '@/contexts/QuickAddContext';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { useTransactionDetail } from '@/hooks/transaction/useTransactionDetail';
import { ExpenseLoadingState } from '@/components/expenses/ExpensesLoading';
import TransactionHero from '@/components/transaction/TransactionHero';
import TransactionMeta from '@/components/transaction/TransactionMeta';
import TransactionNote from '@/components/transaction/TransactionNote';
import TransactionInsight from '@/components/transaction/TransactionInsight';
import TransactionActions from '@/components/transaction/TransactionActions';
import type { Expense } from '@/types/Expense';

const TransactionDetailView = () => {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const { isInitialized } = useDataConfig();
  const { handleExpenseEdit, handleIncomeEdit } = useQuickAdd();
  const detail = useTransactionDetail(id);
  const showSkeleton = useDelayedLoading(!isInitialized);

  if (!isInitialized) {
    return renderLoading(showSkeleton);
  }

  const { transaction } = detail;
  if (!transaction) {
    return renderNotFound(t);
  }

  return (
    <div className="page-shell space-y-7 pb-10">
      <TransactionHero
        transaction={transaction}
        currency={detail.currency}
        isIncome={detail.isIncome}
      />
      <TransactionMeta
        transaction={transaction}
        isExcluded={detail.isExcluded}
      />
      <TransactionNote
        value={detail.note}
        isDirty={detail.isNoteDirty}
        onChange={detail.setNote}
        onSave={() => void detail.saveNote()}
      />
      <TransactionInsight
        description={transaction.description}
        monthTotal={detail.monthTotal}
        monthCount={detail.monthCount}
        similar={detail.similar}
        currency={detail.currency}
      />
      <TransactionActions
        isExcluded={detail.isExcluded}
        onToggleExcluded={() => void detail.toggleExcluded()}
        onEdit={() => openEditor(detail.isIncome, transaction, {
          handleExpenseEdit,
          handleIncomeEdit,
        })}
        onDelete={() => void detail.remove()}
      />
    </div>
  );
};

export default TransactionDetailView;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

type Editors = {
  handleExpenseEdit: (transaction: Expense) => void;
  handleIncomeEdit: (transaction: Expense) => void;
};

// Editing still happens in the existing form dialog. The detail screen is
// where you look at a transaction; changing its amount or date is a different
// job and already has a surface that does it well.
const openEditor = (
  isIncome: boolean,
  transaction: Expense,
  editors: Editors,
) => {
  if (isIncome) {
    editors.handleIncomeEdit(transaction);

    return;
  }

  editors.handleExpenseEdit(transaction);
};

const renderLoading = (showSkeleton: boolean) => {
  if (!showSkeleton) {
    return null;
  }

  return <ExpenseLoadingState />;
};

// Reachable by deep link and by pressing back onto a row that has since been
// deleted, so it needs a real answer rather than an empty screen.
const renderNotFound = (t: TFunc) => (
  <div className="page-shell">
    <div
      className="mt-10 rounded-2xl border border-dashed border-border/50 px-5 py-12 text-center"
      role="status"
    >
      <p className="font-display text-lg font-semibold">
        {t('transaction.notFound')}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {t('transaction.notFoundBody')}
      </p>
      <Link
        to="/activity"
        viewTransition
        className="mt-5 inline-flex min-h-11 items-center rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t('transaction.backToActivity')}
      </Link>
    </div>
  </div>
);
