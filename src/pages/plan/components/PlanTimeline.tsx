import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import { Link } from 'react-router-dom';
import { useDateLocale } from '@/common/hooks/useDateLocale';
import { cn, formatCurrency } from '@/constants/utils';
import {
  TIMELINE_DAYS,
  type MoneyTimeline,
  type MoneyTimelineEntry,
  type TimelineRange,
} from '@/pages/plan/utils/moneyTimeline';
import type { TranslateFunction } from '@/constants/translate';

type PlanTimelineProps = {
  timeline: MoneyTimeline;
  hasSchedules: boolean;
  currency: string;
  onRangeChange: (range: TimelineRange) => void;
};

export const PlanTimeline = ({
  timeline,
  hasSchedules,
  currency,
  onRangeChange,
}: PlanTimelineProps) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  return (
    <section
      // The "Due" figure on the decision card is a hash link to this id. A
      // native jump rather than a scripted scroll: it moves focus as well as
      // the viewport, so a keyboard reader lands on the list, not just near it.
      id="plan-timeline"
      className="mt-6 scroll-mt-20"
      aria-labelledby="plan-timeline-title"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="plan-timeline-title" className="type-heading">
          {t('plan.timeline.title')}
        </h2>
        <Link
          to={buildManageLink(timeline)}
          viewTransition
          className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('plan.timeline.manage')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {renderRangeTabs(timeline.range, onRangeChange, t)}
      {renderSummary(timeline, currency, dateLocale, t)}
      {renderBody(timeline, hasSchedules, currency, dateLocale, onRangeChange, t)}
    </section>
  );
};

type DateLocale = ReturnType<typeof useDateLocale>;

const SEGMENT =
  'segmented-item cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const renderRangeTabs = (
  range: TimelineRange,
  onRangeChange: (range: TimelineRange) => void,
  t: TranslateFunction,
) => (
  <div
    role="tablist"
    aria-label={t('plan.timeline.range.label')}
    className="segmented mt-3"
  >
    <button
      type="button"
      role="tab"
      aria-selected={range === 'month'}
      data-active={range === 'month'}
      onClick={() => onRangeChange('month')}
      className={SEGMENT}
    >
      {t('plan.timeline.range.month')}
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={range === 'days'}
      data-active={range === 'days'}
      onClick={() => onRangeChange('days')}
      className={SEGMENT}
    >
      {t('plan.timeline.range.days', { count: TIMELINE_DAYS })}
    </button>
  </div>
);

// The month window's summary carries the net, because that is the projection
// the window exists to make: what this month's remaining flows leave behind by
// the time it closes. The rolling window has no such closing date to land on,
// so it states the two flows and stops.
const renderSummary = (
  timeline: MoneyTimeline,
  currency: string,
  dateLocale: DateLocale,
  t: TranslateFunction,
) => {
  if (timeline.count === 0) {
    return null;
  }

  return (
    <p className="mt-2 text-sm text-muted-foreground">
      {t(summaryKey(timeline), {
        income: formatCurrency(timeline.incomeTotal, currency),
        expenses: formatCurrency(timeline.expenseTotal, currency),
        net: formatCurrency(timeline.net, currency),
        date: format(timeline.endsOn, 'd LLL', { locale: dateLocale }),
      })}
    </p>
  );
};

const summaryKey = (timeline: MoneyTimeline): string => {
  const scope = `plan.timeline.summary.${timeline.range}`;
  if (timeline.incomeTotal === 0) {
    return `${scope}.expensesOnly`;
  }
  if (timeline.expenseTotal === 0) {
    return `${scope}.incomeOnly`;
  }

  return `${scope}.both`;
};

const renderBody = (
  timeline: MoneyTimeline,
  hasSchedules: boolean,
  currency: string,
  dateLocale: DateLocale,
  onRangeChange: (range: TimelineRange) => void,
  t: TranslateFunction,
) => {
  if (timeline.count === 0) {
    return renderEmpty(timeline, hasSchedules, dateLocale, onRangeChange, t);
  }

  return (
    <div className="surface-card-flush mt-3">
      <ol>
        {timeline.items.map((entry) =>
          renderEntry(entry, currency, dateLocale, t),
        )}
      </ol>
      {renderRemaining(timeline, t)}
    </div>
  );
};

// The timeline can hold recurring income and expenses side by side, but
// /recurring only ever shows one at a time (defaulting to expenses). When the
// window holds income alone, Manage should land there instead of a tab with
// nothing in it — otherwise the destination stays the same one it's always
// been.
const buildManageLink = (timeline: MoneyTimeline): string => {
  if (timeline.expenseTotal === 0 && timeline.incomeTotal > 0) {
    return '/recurring?mode=income';
  }

  return '/recurring';
};

// Three different nothings, one card. No schedules at all is the onboarding
// case and points at /recurring. A quiet rest-of-month is the common one and
// is good news, so it says so and offers the wider window rather than leaving
// the reader at a dead end.
const renderEmpty = (
  timeline: MoneyTimeline,
  hasSchedules: boolean,
  dateLocale: DateLocale,
  onRangeChange: (range: TimelineRange) => void,
  t: TranslateFunction,
) => {
  const card = resolveEmptyCard(timeline, hasSchedules, dateLocale, t);

  return (
    <div className="surface-card mt-3 px-5 py-7">
      <p className="type-heading">{card.title}</p>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
        {card.body}
      </p>
      {renderEmptyAction(card.action, onRangeChange, t)}
    </div>
  );
};

type EmptyAction = 'addPlan' | 'widen' | 'none';

type EmptyCard = {
  title: string;
  body: string;
  action: EmptyAction;
};

const resolveEmptyCard = (
  timeline: MoneyTimeline,
  hasSchedules: boolean,
  dateLocale: DateLocale,
  t: TranslateFunction,
): EmptyCard => {
  if (!hasSchedules) {
    return {
      title: t('plan.timeline.emptyTitle'),
      body: t('plan.timeline.emptyBody'),
      action: 'addPlan',
    };
  }

  if (timeline.range === 'days') {
    return {
      title: t('plan.timeline.quiet.daysTitle'),
      body: t('plan.timeline.quiet.daysBody', { count: TIMELINE_DAYS }),
      action: 'none',
    };
  }

  return {
    title: t('plan.timeline.quiet.monthTitle'),
    body: t('plan.timeline.quiet.monthBody', {
      date: format(timeline.endsOn, 'd LLL', { locale: dateLocale }),
    }),
    action: 'widen',
  };
};

const EMPTY_ACTION =
  'mt-4 inline-flex min-h-11 items-center gap-1 rounded-full bg-foreground px-4 text-sm font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const renderEmptyAction = (
  action: EmptyAction,
  onRangeChange: (range: TimelineRange) => void,
  t: TranslateFunction,
) => {
  if (action === 'addPlan') {
    return (
      <Link to="/recurring" viewTransition className={EMPTY_ACTION}>
        {t('plan.timeline.emptyAction')}
        <ArrowRight className="h-4 w-4" />
      </Link>
    );
  }

  if (action === 'widen') {
    return (
      <button
        type="button"
        onClick={() => onRangeChange('days')}
        className={cn(EMPTY_ACTION, 'cursor-pointer')}
      >
        {t('plan.timeline.quiet.monthAction', { count: TIMELINE_DAYS })}
        <ArrowRight className="h-4 w-4" />
      </button>
    );
  }

  return null;
};

const renderEntry = (
  entry: MoneyTimelineEntry,
  currency: string,
  dateLocale: DateLocale,
  t: TranslateFunction,
) => {
  const isIncome = entry.kind === 'income';
  let dotClass = 'bg-foreground';
  let amountClass = 'text-foreground';
  let sign = '−';
  if (isIncome) {
    dotClass = 'bg-income';
    amountClass = 'text-income-ink';
    sign = '+';
  }

  return (
    <li
      key={entry.id}
      className="flex min-h-19 border-b border-border/30 last:border-b-0"
    >
      <div className="relative flex w-17 shrink-0 flex-col items-center justify-center border-r border-border/50 px-2">
        <span className="type-figure-sm">{format(entry.date, 'd')}</span>
        <span className="tile-label mt-1 text-muted-foreground">
          {format(entry.date, 'LLL', { locale: dateLocale })}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'absolute -right-1 h-2 w-2 rounded-full ring-4 ring-tile',
            dotClass,
          )}
        />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {entry.item.description}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t(`plan.timeline.kind.${entry.kind}`)}
          </p>
        </div>
        <p
          className={cn('shrink-0 text-sm font-bold tabular-nums', amountClass)}
        >
          {sign}
          {formatCurrency(entry.item.amount, currency)}
        </p>
      </div>
    </li>
  );
};

const renderRemaining = (timeline: MoneyTimeline, t: TranslateFunction) => {
  if (timeline.remainingCount === 0) {
    return null;
  }

  return (
    <Link
      to={buildManageLink(timeline)}
      viewTransition
      className="flex min-h-11 items-center justify-center border-t border-border/30 px-4 text-xs font-semibold text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      {t('plan.timeline.more', { count: timeline.remainingCount })}
    </Link>
  );
};
