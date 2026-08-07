import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import { Link } from 'react-router-dom';
import { useDateLocale } from '@/hooks/useDateLocale';
import { cn, formatCurrency } from '@/lib/utils';
import type { RecentActivityItem } from '@/hooks/today/useTodayGuidance';

type Props = {
  items: RecentActivityItem[];
  currency: string;
};

const RecentActivityPreview = ({ items, currency }: Props) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="recent-activity-title">
      <div className="mb-3 flex items-center justify-between">
        <h2
          id="recent-activity-title"
          className="font-display text-xl font-semibold"
        >
          {t('today.recent.title')}
        </h2>
        <Link
          to="/activity"
          viewTransition
          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('today.recent.viewAll')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="surface-card-flush">
        {items.map((item, index) =>
          renderItem(item, index, currency, dateLocale),
        )}
      </div>
    </section>
  );
};

export default RecentActivityPreview;

// --- Helpers ---

const renderItem = (
  item: RecentActivityItem,
  index: number,
  currency: string,
  dateLocale: ReturnType<typeof useDateLocale>,
) => {
  const { transaction } = item;

  return (
    <div
      key={`${item.kind}-${transaction.id}`}
      className={cn(
        'flex items-center gap-3 px-4 py-3.5',
        getDividerClass(index),
      )}
    >
      {renderCategoryMark(
        transaction.category?.icon,
        transaction.category?.color,
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {transaction.description}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {format(parseISO(transaction.date), 'd LLL', { locale: dateLocale })}
          {renderCategoryName(transaction.category?.name)}
        </p>
      </div>
      <p
        className={cn(
          'shrink-0 text-sm font-bold tabular-nums',
          getAmountTone(item.kind),
        )}
      >
        {getAmountPrefix(item.kind)}
        {formatCurrency(transaction.amount, currency)}
      </p>
    </div>
  );
};

const renderCategoryMark = (icon?: string | null, color?: string | null) => {
  let backgroundColor = 'hsl(var(--muted))';
  if (color) {
    backgroundColor = `${color}20`;
  }

  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm"
      style={{ backgroundColor }}
      aria-hidden="true"
    >
      {icon ?? '•'}
    </span>
  );
};

const renderCategoryName = (name?: string) => {
  if (!name) {
    return null;
  }

  return <> · {name}</>;
};

const getAmountPrefix = (kind: RecentActivityItem['kind']): string => {
  if (kind === 'income') {
    return '+';
  }

  return '−';
};

const getAmountTone = (kind: RecentActivityItem['kind']): string => {
  if (kind === 'income') {
    return 'text-income';
  }

  return 'text-foreground';
};

const getDividerClass = (index: number): string => {
  if (index > 0) {
    return 'border-t border-border/30';
  }

  return '';
};
