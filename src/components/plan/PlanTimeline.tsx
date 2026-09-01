import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import { Link } from 'react-router-dom';
import { useDateLocale } from '@/hooks/useDateLocale';
import { cn, formatCurrency } from '@/lib/utils';
import type { MoneyTimeline, MoneyTimelineEntry } from '@/lib/moneyTimeline';

type Props = {
  timeline: MoneyTimeline;
  currency: string;
};

const PlanTimeline = ({ timeline, currency }: Props) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  return (
    <section className="mt-6" aria-labelledby="plan-timeline-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="plan-timeline-title" className="type-heading">
            {t('plan.timeline.title')}
          </h2>
          {renderSummary(timeline, currency, t)}
        </div>
        <Link
          to="/recurring"
          viewTransition
          className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('plan.timeline.manage')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {renderBody(timeline, currency, dateLocale, t)}
    </section>
  );
};

export default PlanTimeline;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;
type DateLocale = ReturnType<typeof useDateLocale>;

const renderSummary = (timeline: MoneyTimeline, currency: string, t: TFunc) => {
  if (timeline.count === 0) {
    return null;
  }

  let key = 'plan.timeline.summary.both';
  if (timeline.incomeTotal === 0) {
    key = 'plan.timeline.summary.expensesOnly';
  }
  if (timeline.expenseTotal === 0) {
    key = 'plan.timeline.summary.incomeOnly';
  }

  return (
    <p className="mt-0.5 text-sm text-muted-foreground">
      {t(key, {
        income: formatCurrency(timeline.incomeTotal, currency),
        expenses: formatCurrency(timeline.expenseTotal, currency),
      })}
    </p>
  );
};

const renderBody = (
  timeline: MoneyTimeline,
  currency: string,
  dateLocale: DateLocale,
  t: TFunc,
) => {
  if (timeline.count === 0) {
    return renderEmpty(t);
  }

  return (
    <div className="surface-card-flush mt-3">
      <ol>
        {timeline.items.map((entry) =>
          renderEntry(entry, currency, dateLocale, t),
        )}
      </ol>
      {renderRemaining(timeline.remainingCount, t)}
    </div>
  );
};

const renderEmpty = (t: TFunc) => (
  <div className="surface-card mt-3 px-5 py-7">
    <p className="type-heading">{t('plan.timeline.emptyTitle')}</p>
    <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
      {t('plan.timeline.emptyBody')}
    </p>
    <Link
      to="/recurring"
      viewTransition
      className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-full bg-foreground px-4 text-sm font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {t('plan.timeline.emptyAction')}
      <ArrowRight className="h-4 w-4" />
    </Link>
  </div>
);

const renderEntry = (
  entry: MoneyTimelineEntry,
  currency: string,
  dateLocale: DateLocale,
  t: TFunc,
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

const renderRemaining = (remainingCount: number, t: TFunc) => {
  if (remainingCount === 0) {
    return null;
  }

  return (
    <Link
      to="/recurring"
      viewTransition
      className="flex min-h-11 items-center justify-center border-t border-border/30 px-4 text-xs font-semibold text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      {t('plan.timeline.more', { count: remainingCount })}
    </Link>
  );
};
