import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import CalendarClock from 'lucide-react/dist/esm/icons/calendar-clock';
import { Link } from 'react-router-dom';
import { useDateLocale } from '@/hooks/useDateLocale';
import { formatCurrency } from '@/lib/utils';
import type { UpcomingEntry } from '@/lib/upcomingBills';

type Props = {
  items: UpcomingEntry[];
  count: number;
  currency: string;
  /** Today frames these as a nudge, Plan as the month's commitments. */
  title: string;
  summary: string;
};

const UpcomingBillsCard = ({
  items,
  count,
  currency,
  title,
  summary,
}: Props) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  if (count === 0) {
    return null;
  }

  return (
    <section aria-labelledby="upcoming-bills-title">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2
            id="upcoming-bills-title"
            className="type-heading"
          >
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{summary}</p>
        </div>
        <Link
          to="/recurring"
          viewTransition
          className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('upcomingBills.manage')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="surface-card-flush">
        {items.map((entry, index) =>
          renderEntry(entry, index, currency, dateLocale),
        )}
      </div>
    </section>
  );
};

export default UpcomingBillsCard;

// --- Helpers ---

const renderEntry = (
  entry: UpcomingEntry,
  index: number,
  currency: string,
  dateLocale: ReturnType<typeof useDateLocale>,
) => {
  if (entry.nextDate === null) {
    return null;
  }

  let borderClass = '';
  if (index > 0) {
    borderClass = 'border-t border-border/30';
  }

  return (
    <div
      key={entry.item.id}
      className={`flex items-center gap-3 px-4 py-3.5 ${borderClass}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-ink">
        <CalendarClock className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {entry.item.description}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(entry.nextDate, 'EEEE, d LLL', { locale: dateLocale })}
        </p>
      </div>
      <p className="shrink-0 text-sm font-bold tabular-nums">
        {formatCurrency(entry.item.amount, currency)}
      </p>
    </div>
  );
};
