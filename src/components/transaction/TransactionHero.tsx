import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { describeAmount } from '@/lib/transactionAmount';
import { getColorTint } from '@/lib/categoryColor';
import { useDateLocale } from '@/hooks/useDateLocale';
import type { Expense } from '@/types/Expense';

type Props = {
  transaction: Expense;
  currency: string;
  isIncome: boolean;
};

// The top of the detail screen: what it was, and how much. Carries the
// view-transition name that pairs it with the row it was opened from, so the
// mark and the amount travel between the two screens instead of cross-fading.
const TransactionHero = ({ transaction, currency, isIncome }: Props) => {
  const dateLocale = useDateLocale();
  const amount = describeAmount(
    transaction.amount,
    resolveKind(isIncome),
    currency,
  );

  return (
    <header className="flex flex-col items-center gap-3 pt-2 text-center">
      <span
        className="flex h-16 w-16 items-center justify-center rounded-full text-2xl"
        style={{
          backgroundColor: getColorTint(transaction.category?.color),
          viewTransitionName: `tx-mark-${transaction.id}`,
        }}
        aria-hidden="true"
      >
        {transaction.category?.icon ?? '•'}
      </span>
      <h1 className="max-w-xs type-heading text-xl">
        {transaction.description}
      </h1>
      <p
        className={cn(
          'type-figure-xl text-[2.5rem]',
          amount.tone,
        )}
        style={{ viewTransitionName: `tx-amount-${transaction.id}` }}
      >
        {amount.text}
      </p>
      <p className="text-sm text-muted-foreground">
        {format(parseISO(transaction.date), 'PPPP', { locale: dateLocale })}
      </p>
    </header>
  );
};

export default TransactionHero;

// --- Helpers ---

const resolveKind = (isIncome: boolean): 'expense' | 'income' => {
  if (isIncome) {
    return 'income';
  }

  return 'expense';
};
