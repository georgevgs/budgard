import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CategoryGlyph } from '@/common/components/common/CategoryGlyph';
import { cn } from '@/constants/utils';
import { describeAmount } from '@/constants/transactionAmount';
import type { Expense } from '@/types/Expense';

type TransactionRowProps = {
  transaction: Expense;
  kind: 'expense' | 'income';
  currency: string;
  /** Line under the description — category, time, or both. */
  meta: string;
  to: string;
};

// One transaction, as a row inside the recent-activity card. Rows share one
// surface with no rules between them, the grouped list every banking app uses.
const TransactionRow = ({
  transaction,
  kind,
  currency,
  meta,
  to,
}: TransactionRowProps) => {
  const { t } = useTranslation();
  const amount = describeAmount(transaction.amount, kind, currency);

  return (
    <Link
      to={to}
      viewTransition
      aria-label={t('activity.openTransaction', {
        description: transaction.description,
      })}
      className="flex w-full cursor-pointer items-center gap-3.5 px-4 py-3 text-left transition-[background-color,transform] hover:bg-foreground/4 active:scale-[0.985] active:bg-foreground/7 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <CategoryGlyph transaction={transaction} className="h-10 w-10" />
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3.5 gap-y-1">
        <span className="min-w-0 flex-[1_1_6rem]">
          <span className="block truncate text-[0.9rem] font-medium leading-tight">
            {transaction.description}
          </span>
          <span className="mt-0.5 block truncate text-[0.75rem] leading-tight text-muted-foreground">
            {meta}
          </span>
        </span>
        <span
          className={cn(
            'ml-auto shrink-0 text-[0.9rem] font-semibold tabular-nums',
            amount.tone,
          )}
        >
          {amount.text}
        </span>
      </span>
    </Link>
  );
};

export default TransactionRow;
