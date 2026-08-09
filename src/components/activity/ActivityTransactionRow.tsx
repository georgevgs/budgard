import { useTranslation } from 'react-i18next';
import ExpensesCardActions from '@/components/expenses/ExpensesCardActions';
import IncomeCardActions from '@/components/income/IncomeCardActions';
import { cn, formatCurrency } from '@/lib/utils';
import type { Expense } from '@/types/Expense';
import { getColorTint } from '@/lib/categoryColor';

type Props = {
  transaction: Expense;
  currency: string;
  onExpenseEdit: (expense: Expense) => void;
  onExpenseDelete: (id: string) => void;
  onSaveAsTemplate: (expense: Expense) => void;
  onIncomeEdit: (income: Expense) => void;
  onIncomeDelete: (id: string) => void;
};

const ActivityTransactionRow = (props: Props) => {
  const { t } = useTranslation();
  const { transaction } = props;
  const isIncome = transaction.type === 'income';

  return (
    <div className="flex min-h-[4.5rem] items-center gap-1 pr-2">
      {/* The row itself opens the editor — reaching for the overflow menu to
          fix a typo is a step too many on a list people scan every day. */}
      <button
        type="button"
        onClick={() => handleEdit(props, isIncome)}
        aria-label={t('activity.editTransaction', {
          description: transaction.description,
        })}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-3 pl-4 pr-2 text-left transition-colors hover:bg-accent/40 active:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {renderCategoryMark(transaction)}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {transaction.description}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {renderCategoryName(transaction, t)}
          </span>
        </span>
        <span
          className={cn(
            'shrink-0 text-sm font-bold tabular-nums',
            getAmountTone(isIncome),
          )}
        >
          {getAmountPrefix(isIncome)}
          {formatCurrency(transaction.amount, props.currency)}
        </span>
      </button>
      {renderActions(props, isIncome)}
    </div>
  );
};

export default ActivityTransactionRow;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const handleEdit = (props: Props, isIncome: boolean) => {
  if (isIncome) {
    props.onIncomeEdit(props.transaction);

    return;
  }

  props.onExpenseEdit(props.transaction);
};

const renderCategoryMark = (transaction: Expense) => {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm"
      style={{ backgroundColor: getColorTint(transaction.category?.color) }}
      aria-hidden="true"
    >
      {transaction.category?.icon ?? '•'}
    </span>
  );
};

const renderCategoryName = (transaction: Expense, t: TFunc) => {
  if (transaction.category?.name) {
    return transaction.category.name;
  }

  return t('activity.uncategorized');
};

const renderActions = (props: Props, isIncome: boolean) => {
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

const getAmountPrefix = (isIncome: boolean): string => {
  if (isIncome) {
    return '+';
  }

  return '−';
};

const getAmountTone = (isIncome: boolean): string => {
  if (isIncome) {
    return 'text-income';
  }

  return 'text-foreground';
};
