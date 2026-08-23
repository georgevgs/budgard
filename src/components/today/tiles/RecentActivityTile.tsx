import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import { Link } from 'react-router-dom';
import BentoTile from '@/components/bento/BentoTile';
import TileLabel from '@/components/bento/TileLabel';
import TransactionPill from '@/components/common/TransactionPill';
import { useDateLocale } from '@/hooks/useDateLocale';
import type { Expense } from '@/types/Expense';
import type { RecentActivityItem } from '@/hooks/today/useTodayGuidance';

type Props = {
  items: RecentActivityItem[];
  currency: string;
  onExpenseEdit: (expense: Expense) => void;
  onIncomeEdit: (income: Expense) => void;
};

type Locale = ReturnType<typeof useDateLocale>;

// What already happened, as its own group of pills rather than one card. The
// module has no ground of its own — see the `bare` tone in BentoTile.
const RecentActivityTile = ({
  items,
  currency,
  onExpenseEdit,
  onIncomeEdit,
}: Props) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  if (items.length === 0) {
    return null;
  }

  const handleEdit = (item: RecentActivityItem) => {
    if (item.kind === 'income') {
      onIncomeEdit(item.transaction);

      return;
    }
    onExpenseEdit(item.transaction);
  };

  return (
    <BentoTile tone="bare" wide className="mt-1">
      <div className="mb-2.5 flex items-baseline justify-between gap-3 px-1">
        <TileLabel>{t('today.recent.title')}</TileLabel>
        <Link
          to="/activity"
          viewTransition
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('today.recent.viewAll')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) =>
          renderPill(item, currency, dateLocale, handleEdit),
        )}
      </div>
    </BentoTile>
  );
};

export default RecentActivityTile;

// --- Helpers ---

const renderPill = (
  item: RecentActivityItem,
  currency: string,
  dateLocale: Locale,
  onEdit: (item: RecentActivityItem) => void,
) => {
  return (
    <TransactionPill
      key={`${item.kind}-${item.transaction.id}`}
      transaction={item.transaction}
      kind={item.kind}
      currency={currency}
      meta={buildMeta(item, dateLocale)}
      onSelect={() => onEdit(item)}
    />
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
