import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CategoryGlyph } from '@/common/components/common/CategoryGlyph';
import { ExpensesCardActions } from '@/pages/activity/components/ExpensesCardActions';
import { IncomeCardActions } from '@/pages/activity/components/IncomeCardActions';
import { cn } from '@/constants/utils';
import { describeAmount } from '@/constants/transactionAmount';
import type { Expense } from '@/types/Expense';
import type { TranslateFunction } from '@/constants/translate';

type ActivityTransactionRowProps = {
  transaction: Expense;
  currency: string;
  onExpenseEdit: (expense: Expense) => void;
  onExpenseDelete: (id: string) => void;
  onSaveAsTemplate: (expense: Expense) => void;
  onIncomeEdit: (income: Expense) => void;
  onIncomeDelete: (id: string) => void;
};

export const ActivityTransactionRow = (props: ActivityTransactionRowProps) => {
  const { t } = useTranslation();
  const { transaction } = props;
  const isIncome = transaction.type === 'income';
  const amount = describeAmount(
    transaction.amount,
    resolveKind(isIncome),
    props.currency,
  );

  return (
    <div className="flex min-h-15 items-center gap-1 pr-1.5">
      {/* The row opens the transaction rather than the editor. Correcting a
          typo is one more tap than it was, but "what was this and how often do
          I do it" is the question people actually bring to a list they scan
          every day — and the editor is the first action on the screen it
          lands on. */}
      <Link
        to={`/t/${transaction.id}`}
        viewTransition
        aria-label={t('activity.openTransaction', {
          description: transaction.description,
        })}
        className="flex min-w-0 flex-1 items-center gap-3.5 rounded-[1.375rem] py-3 pl-4 pr-2 text-left transition-colors hover:bg-accent/40 active:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {renderCategoryMark(transaction)}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9rem] font-medium leading-tight">
            {transaction.description}
          </span>
          <span className="mt-0.5 block truncate text-[0.72rem] leading-tight text-foreground">
            {renderCategoryName(transaction, t)}
          </span>
        </span>
        <span
          className={cn(
            'shrink-0 text-[0.9rem] font-semibold tabular-nums',
            amount.tone,
          )}
          style={{ viewTransitionName: `tx-amount-${transaction.id}` }}
        >
          {amount.text}
        </span>
      </Link>
      {renderActions(props, isIncome)}
    </div>
  );
};

// The category mark is shared with the pills Today draws, so the same
// transaction is headed by the same SVG wherever it is listed.
const renderCategoryMark = (transaction: Expense) => {
  return (
    <CategoryGlyph
      transaction={transaction}
      style={{ viewTransitionName: `tx-mark-${transaction.id}` }}
    />
  );
};

const renderCategoryName = (transaction: Expense, t: TranslateFunction) => {
  if (transaction.category?.name) {
    return transaction.category.name;
  }

  return t('activity.uncategorized');
};

const renderActions = (props: ActivityTransactionRowProps, isIncome: boolean) => {
  if (isIncome) {
    return (
      <IncomeCardActions
        income={props.transaction}
        onEdit={props.onIncomeEdit}
        onDelete={props.onIncomeDelete}
      />
    );
  }

  return (
    <ExpensesCardActions
      expense={props.transaction}
      onEdit={props.onExpenseEdit}
      onDelete={props.onExpenseDelete}
      onSaveAsTemplate={props.onSaveAsTemplate}
    />
  );
};

const resolveKind = (isIncome: boolean): 'expense' | 'income' => {
  if (isIncome) {
    return 'income';
  }

  return 'expense';
};
