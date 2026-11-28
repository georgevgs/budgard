import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import TransactionRow from '@/pages/today/components/TransactionRow/TransactionRow';
import { useDateLocale } from '@/common/hooks/useDateLocale';
import type { RecentActivityItem } from '@/pages/today/hooks/useTodayGuidance';
import { BentoTile } from '@/common/components/bento';

type RecentActivityTileProps = {
  items: RecentActivityItem[];
  currency: string;
};

type Locale = ReturnType<typeof useDateLocale>;

// What already happened, as one grouped card under its heading. The heading
// sits outside the card, so the module itself has no ground, see the `bare`
// tone in BentoTile.
export const RecentActivityTile = ({
  items,
  currency,
}: RecentActivityTileProps) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  if (items.length === 0) {
    return null;
  }

  return (
    <BentoTile tone="bare" isWide className="mt-1">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
        <h2 className="type-heading">{t('today.recent.title')}</h2>
        <Link
          to="/activity"
          viewTransition
          className="rounded-full text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('today.recent.viewAll')}
        </Link>
      </div>
      <div className="tile-flush py-1.5">
        {items.map((item) => (
          <TransactionRow
            key={`${item.kind}-${item.transaction.id}`}
            transaction={item.transaction}
            kind={item.kind}
            currency={currency}
            meta={buildMeta(item, dateLocale)}
            to={`/t/${item.transaction.id}`}
          />
        ))}
      </div>
    </BentoTile>
  );
};

const buildMeta = (item: RecentActivityItem, dateLocale: Locale): string => {
  const day = format(parseISO(item.transaction.date), 'd LLL', {
    locale: dateLocale,
  });
  const category = item.transaction.category?.name;
  if (!category) {
    return day;
  }

  return `${category} · ${day}`;
};
