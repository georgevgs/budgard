import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { useDateLocale } from '@/hooks/useDateLocale';
import { formatCurrency } from '@/lib/utils';
import type { Expense } from '@/types/Expense';

type Props = {
  description: string;
  monthTotal: number;
  monthCount: number;
  similar: Expense[];
  currency: string;
};

// The part of the screen a list row cannot give you: how often this repeats
// and what it comes to. One coffee is a number; twelve coffees is a habit.
const TransactionInsight = (props: Props) => {
  const { t } = useTranslation();

  // A single occurrence is not a pattern, and saying "1 time this month, €4"
  // under a €4 transaction is just the same number twice.
  if (props.monthCount < 2) {
    return null;
  }

  return (
    <section
      className="surface-card p-4"
      aria-labelledby="tx-insight-title"
    >
      <h2
        id="tx-insight-title"
        className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground"
      >
        {t('transaction.insight.title')}
      </h2>
      <p className="mt-2 type-heading">
        {t('transaction.insight.summary', {
          count: props.monthCount,
          amount: formatCurrency(props.monthTotal, props.currency),
          name: props.description,
        })}
      </p>
      {renderSimilar(props)}
    </section>
  );
};

export default TransactionInsight;

// --- Helpers ---

const renderSimilar = (props: Props) => {
  if (props.similar.length === 0) {
    return null;
  }

  return (
    <ul className="mt-3 divide-y divide-border/30 border-t border-border/30">
      {props.similar.map((row) => (
        <li key={row.id}>
          <Link
            to={`/t/${row.id}`}
            viewTransition
            className="flex items-center justify-between gap-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            <SimilarDate date={row.date} />
            <span className="shrink-0 font-semibold tabular-nums">
              {formatCurrency(row.amount, props.currency)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};

const SimilarDate = ({ date }: { date: string }) => {
  const dateLocale = useDateLocale();

  return (
    <span className="text-muted-foreground">
      {format(parseISO(date), 'd MMM yyyy', { locale: dateLocale })}
    </span>
  );
};
