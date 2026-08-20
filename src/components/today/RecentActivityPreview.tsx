import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import { Link } from 'react-router-dom';
import { useDateLocale } from '@/hooks/useDateLocale';
import { cn, formatCurrency } from '@/lib/utils';
import type { Expense } from '@/types/Expense';
import type { RecentActivityItem } from '@/hooks/today/useTodayGuidance';
import { getColorTint } from '@/lib/categoryColor';

type Props = {
  items: RecentActivityItem[];
  currency: string;
  onExpenseEdit: (expense: Expense) => void;
  onIncomeEdit: (income: Expense) => void;
};

const RecentActivityPreview = ({
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
          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('today.recent.viewAll')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="surface-card-flush">
        {items.map((item, index) =>
          renderItem(item, index, currency, dateLocale, handleEdit, t),
        )}
      </div>
    </section>
  );
};

export default RecentActivityPreview;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

// Identical rows to the Activity feed, so they behave identically: tapping one
// opens its editor. They used to be inert divs, which made the same list look
// interactive on one screen and dead on the one people land on.
const renderItem = (
  item: RecentActivityItem,
  index: number,
  currency: string,
  dateLocale: ReturnType<typeof useDateLocale>,
  onEdit: (item: RecentActivityItem) => void,
  t: TFunc,
) => {
  const { transaction } = item;

  return (
    <button
      key={`${item.kind}-${transaction.id}`}
      type="button"
      onClick={() => onEdit(item)}
      aria-label={t('activity.editTransaction', {
        description: transaction.description,
      })}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/40 active:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        getDividerClass(index),
      )}
    >
      {renderCategoryMark(
        transaction.category?.icon,
        transaction.category?.color,
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {transaction.description}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {format(parseISO(transaction.date), 'd LLL', { locale: dateLocale })}
          {renderCategoryName(transaction.category?.name)}
        </span>
      </span>
      <span
        className={cn(
          'shrink-0 text-sm font-bold tabular-nums',
          getAmountTone(item.kind),
        )}
      >
        {getAmountPrefix(item.kind)}
        {formatCurrency(transaction.amount, currency)}
      </span>
    </button>
  );
};

const renderCategoryMark = (icon?: string | null, color?: string | null) => {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm"
      style={{ backgroundColor: getColorTint(color) }}
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
    return 'text-income-ink';
  }

  return 'text-foreground';
};

const getDividerClass = (index: number): string => {
  if (index > 0) {
    return 'border-t border-border/30';
  }

  return '';
};
