import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import ActivityTransactionRow from '@/components/activity/ActivityTransactionRow';
import SwipeableRow from '@/components/activity/SwipeableRow';
import PendingHistoryNotice from '@/components/common/PendingHistoryNotice';
import { groupExpensesByDate } from '@/lib/dateGrouping';
import { useDateLocale } from '@/hooks/useDateLocale';
import { formatCurrency } from '@/lib/utils';
import { sumSpending } from '@/lib/spending';
import type { Expense } from '@/types/Expense';

type Props = {
  transactions: Expense[];
  currency: string;
  matchesOutsidePeriod: number;
  isHistoryPending: boolean;
  onSearchEverywhere: () => void;
  onExpenseEdit: (expense: Expense) => void;
  onExpenseDelete: (id: string) => void;
  onSaveAsTemplate: (expense: Expense) => void;
  onIncomeEdit: (income: Expense) => void;
  onIncomeDelete: (id: string) => void;
};

const PAGE_SIZE = 20;

const ActivityFeed = (props: Props) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const hasMore = visibleCount < props.transactions.length;
  // The list extends itself as it is scrolled. A "Show more" button asks the
  // user to keep confirming that they do, in fact, want to keep reading.
  const sentinelRef = useInfiniteScroll({
    hasMore,
    onLoadMore: () => setVisibleCount((current) => current + PAGE_SIZE),
  });
  const groups = useMemo(
    () =>
      groupExpensesByDate(
        props.transactions.slice(0, visibleCount),
        dateLocale,
        t,
      ),
    [dateLocale, props.transactions, t, visibleCount],
  );

  if (props.transactions.length === 0) {
    // Older months arrive with the stage-2 history top-up. Telling the user
    // there is nothing here while their rows are still in flight would be a
    // lie, so the shimmer wins over the empty state until history lands.
    if (props.isHistoryPending) {
      return <PendingHistoryNotice />;
    }

    return (
      <div
        className="rounded-[1.625rem] border border-dashed border-border px-5 py-10 text-center sm:px-6 sm:py-12"
        role="status"
      >
        <p className="type-heading">{t('activity.emptyTitle')}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {t('activity.emptyBody')}
        </p>
        {renderSearchEverywhere(
          props.matchesOutsidePeriod,
          props.onSearchEverywhere,
          t,
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => renderGroup(group, props, t))}
      {renderPendingHistory(props.isHistoryPending)}
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      {renderLoadMore(
        hasMore,
        () => setVisibleCount(visibleCount + PAGE_SIZE),
        t,
      )}
    </div>
  );
};

export default ActivityFeed;

// --- Helpers ---

// Rows already on screen stay usable while the rest streams in underneath.
const renderPendingHistory = (isHistoryPending: boolean) => {
  if (!isHistoryPending) {
    return null;
  }

  return <PendingHistoryNotice />;
};

type DateGroup = ReturnType<typeof groupExpensesByDate>[number];
type TFunc = (key: string, options?: Record<string, unknown>) => string;

// The month you happen to be looking at is the single most common reason a
// search "finds nothing". Rather than making the user step back through months
// to discover that, offer the wider search where the dead end appears.
const renderSearchEverywhere = (
  matchesOutsidePeriod: number,
  onSearchEverywhere: () => void,
  t: TFunc,
) => {
  if (matchesOutsidePeriod === 0) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="mt-5 rounded-full"
      onClick={onSearchEverywhere}
    >
      {t('activity.searchEverywhere', { count: matchesOutsidePeriod })}
    </Button>
  );
};

const renderGroup = (group: DateGroup, props: Props, t: TFunc) => (
  <section
    key={group.date}
    aria-labelledby={`activity-${group.date}`}
    className="activity-day-group"
  >
    <div className="activity-day-header mb-2.5 flex items-baseline justify-between gap-3 rounded-full px-1 py-1.5">
      <h2
        id={`activity-${group.date}`}
        className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
      >
        {group.label}
      </h2>
      {renderDayTotal(group, props.currency)}
    </div>
    <div className="flex flex-col gap-2">
      {group.expenses.map((transaction) => (
        <SwipeableRow
          key={transaction.id}
          deleteLabel={t('activity.deleteTransaction', {
            description: transaction.description,
          })}
          onDelete={() => deleteTransaction(transaction, props)}
        >
          <ActivityTransactionRow
            transaction={transaction}
            currency={props.currency}
            onExpenseEdit={props.onExpenseEdit}
            onExpenseDelete={props.onExpenseDelete}
            onSaveAsTemplate={props.onSaveAsTemplate}
            onIncomeEdit={props.onIncomeEdit}
            onIncomeDelete={props.onIncomeDelete}
          />
        </SwipeableRow>
      ))}
    </div>
  </section>
);

const deleteTransaction = (transaction: Expense, props: Props) => {
  if (transaction.type === 'income') {
    props.onIncomeDelete(transaction.id);

    return;
  }

  props.onExpenseDelete(transaction.id);
};

// Only money that left the account is summed here. A mixed net figure on a day
// that holds both a salary and a coffee reads as nonsense.
const renderDayTotal = (group: DateGroup, currency: string) => {
  const spent = sumSpending(group.expenses);

  if (spent <= 0) {
    return null;
  }

  return (
    <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
      −{formatCurrency(spent, currency)}
    </span>
  );
};

// Kept as a fallback for anyone whose browser has no IntersectionObserver,
// and as a keyboard affordance — tabbing to the end of a list that only ever
// extends on scroll would otherwise be a dead end.
const renderLoadMore = (hasMore: boolean, onLoadMore: () => void, t: TFunc) => {
  if (!hasMore) {
    return null;
  }

  return (
    <Button
      variant="outline"
      className="w-full rounded-full border-0 bg-tile shadow-[inset_0_0_0_1px_hsl(var(--tile-ring))]"
      onClick={onLoadMore}
    >
      {t('activity.loadMore')}
    </Button>
  );
};
