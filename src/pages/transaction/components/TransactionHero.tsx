import { format, parseISO } from 'date-fns';
import { CategoryIcon } from '@/common/components/common/CategoryIcon';
import { cn } from '@/constants/utils';
import { describeAmount } from '@/constants/transactionAmount';
import { useDateLocale } from '@/common/hooks/useDateLocale';
import type { Expense } from '@/types/Expense';

type TransactionHeroProps = {
  transaction: Expense;
  currency: string;
  isIncome: boolean;
};

// The top of the detail screen: what it was, and how much. Carries the
// view-transition name that pairs it with the row it was opened from, so the
// mark and the amount travel between the two screens instead of cross-fading.
export const TransactionHero = ({
  transaction,
  currency,
  isIncome,
}: TransactionHeroProps) => {
  const dateLocale = useDateLocale();
  const amount = describeAmount(
    transaction.amount,
    resolveKind(isIncome),
    currency,
  );

  return (
    <header className="flex flex-col items-center gap-3 pt-2 text-center">
      <span
        className="object-tile flex h-16 w-16 items-center justify-center rounded-[32%]"
        style={{ viewTransitionName: `tx-mark-${transaction.id}` }}
        aria-hidden="true"
      >
        <CategoryIcon
          icon={getCategoryIconOrNull(transaction)}
          className="h-[68%] w-[68%]"
        />
      </span>
      <h1 className="max-w-xs type-heading text-xl">
        {transaction.description}
      </h1>
      <p
        className={cn('type-figure-xl text-[2.5rem]', amount.tone)}
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

const resolveKind = (isIncome: boolean): 'expense' | 'income' => {
  if (isIncome) {
    return 'income';
  }

  return 'expense';
};

const getCategoryIconOrNull = (transaction: Expense): string | null => {
  if (undefined === transaction.category) {
    return null;
  }

  return transaction.category.icon;
};
