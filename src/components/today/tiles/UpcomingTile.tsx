import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import BentoTile from '@/components/bento/BentoTile';
import TileLabel from '@/components/bento/TileLabel';
import { useDateLocale } from '@/hooks/useDateLocale';
import { formatCurrency } from '@/lib/utils';
import type { UpcomingBills, UpcomingEntry } from '@/lib/upcomingBills';

type Props = {
  upcoming: UpcomingBills;
  currency: string;
};

type Locale = ReturnType<typeof useDateLocale>;

// What is about to leave the account, at a glance. The day abbreviation is the
// column that matters — "Mon" answers "is this before or after payday" faster
// than a date does, which is the only question a seven-day window raises.
const UpcomingTile = ({ upcoming, currency }: Props) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  if (upcoming.count === 0) {
    return null;
  }

  return (
    <BentoTile
      wide
      to="/recurring"
      ariaLabel={t('today.upcoming.title')}
      className="px-4.5 py-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <TileLabel>{t('today.tiles.upcoming')}</TileLabel>
        <span className="text-xs font-medium text-primary-ink">
          {t('today.tile.billsSummary', {
            amount: formatCurrency(upcoming.total, currency),
            count: upcoming.count,
          })}
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-2.5">
        {upcoming.items.map((entry) =>
          renderEntry(entry, currency, dateLocale),
        )}
      </div>
    </BentoTile>
  );
};

export default UpcomingTile;

// --- Helpers ---

const renderEntry = (
  entry: UpcomingEntry,
  currency: string,
  dateLocale: Locale,
) => {
  if (entry.nextDate === null) {
    return null;
  }

  return (
    <div key={entry.item.id} className="flex items-center gap-3">
      <span className="w-8.5 shrink-0 text-[0.65rem] font-semibold uppercase leading-none tracking-[0.1em] text-muted-foreground">
        {format(entry.nextDate, 'EEE', { locale: dateLocale })}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {entry.item.description}
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        {formatCurrency(entry.item.amount, currency)}
      </span>
    </div>
  );
};
