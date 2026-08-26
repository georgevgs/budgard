import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import CategoryGlyph from '@/components/common/CategoryGlyph';
import { cn } from '@/lib/utils';
import { describeAmount } from '@/lib/transactionAmount';
import type { Expense } from '@/types/Expense';

type Props = {
  transaction: Expense;
  kind: 'expense' | 'income';
  currency: string;
  /** Line under the description — category, time, or both. */
  meta: string;
  to: string;
};

// One transaction, as its own rounded object rather than a row inside a list
// card. The bento redesign makes every list a stack of these: a row that is
// its own shape can be tapped, swiped and reordered without the divider above
// it having to mean something.
const TransactionPill = ({ transaction, kind, currency, meta, to }: Props) => {
  const { t } = useTranslation();
  const amount = describeAmount(transaction.amount, kind, currency);

  return (
    <Link
      to={to}
      viewTransition
      aria-label={t('activity.openTransaction', {
        description: transaction.description,
      })}
      className="tile flex w-full cursor-pointer items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-accent/40 active:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <CategoryGlyph transaction={transaction} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9rem] font-medium leading-tight">
          {transaction.description}
        </span>
        <span className="mt-0.5 block truncate text-[0.72rem] leading-tight text-foreground">
          {meta}
        </span>
      </span>
      <span
        className={cn(
          'shrink-0 text-[0.9rem] font-semibold tabular-nums',
          amount.tone,
        )}
      >
        {amount.text}
      </span>
    </Link>
  );
};

export default TransactionPill;
