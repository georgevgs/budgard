import { getDaysInMonth } from 'date-fns';
import { useTranslation } from 'react-i18next';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import { Link } from 'react-router-dom';
import MoneyPath from '@/components/today/MoneyPath';
import TodayAmount from '@/components/today/TodayAmount';
import TodayStatusChip from '@/components/today/TodayStatusChip';
import { formatCurrency, cn } from '@/lib/utils';
import type {
  MoneyPathPoint,
  TodayStatus,
} from '@/hooks/today/useTodayGuidance';

type Props = {
  greeting: 'morning' | 'afternoon' | 'evening';
  status: TodayStatus;
  safeToSpend: number | null;
  dailyAllowance: number | null;
  monthLabel: string;
  currency: string;
  upcomingThisMonth: number;
  everydayProgress: number;
  moneyPath: MoneyPathPoint[];
  spentThisMonth: number;
  spentLastMonthToDate: number;
  typicalDay: number | null;
  daysRemaining: number;
};

const TodayHero = (props: Props) => {
  const { t } = useTranslation();

  return (
    <section className={cn('today-hero', getHeroTone(props.status))}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold opacity-65">
          {t(`today.greeting.${props.greeting}`)}
          <span aria-hidden="true"> · </span>
          {props.monthLabel}
        </p>
        <TodayStatusChip status={props.status} />
      </div>
      <h1 className="mt-3 max-w-xl font-display text-[2rem] font-semibold leading-[1.06] tracking-[-0.035em] sm:text-[2.55rem]">
        {t(`today.status.${props.status}`)}
      </h1>
      {renderGuidance(props, t)}
      {renderMoneyPath(props)}
    </section>
  );
};

export default TodayHero;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

// Empty points mean there is no everyday budget to chart — either no monthly
// budget at all, or fixed costs already consume it. Both make a pace curve
// meaningless, so the chart and its caption drop out together.
const renderMoneyPath = (props: Props) => {
  if (props.status === 'noBudget') {
    return null;
  }
  if (props.moneyPath.length === 0) {
    return null;
  }

  return (
    <MoneyPath
      points={props.moneyPath}
      daysInMonth={getDaysInMonth(new Date())}
      today={new Date().getDate()}
      status={props.status}
      everydayProgress={props.everydayProgress}
    />
  );
};

// Without a budget there is no "safe to spend", but there is still a real
// answer to "how is this month going" — what you have spent, and whether that
// is ahead of where you were by this day last month. Leading with a bare
// CTA made the landing tab emptiest for exactly the users least set up.
const renderNoBudgetGuidance = (props: Props, t: TFunc) => (
  <div className="mt-5">
    <TodayAmount amount={props.spentThisMonth} currency={props.currency} />
    {/* The month is deliberately not interpolated here. date-fns only offers
        nominative (LLLL) and genitive (MMMM) month names, and Greek needs the
        accusative after "τον" — so any embedded month reads as broken grammar.
        The header line above already names the month. */}
    <p className="mt-2 max-w-lg text-sm leading-relaxed opacity-70">
      {t('today.spentSoFar')}
    </p>
    {renderMonthComparison(props, t)}
    <Link
      to="/plan"
      viewTransition
      className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {t('today.setBudget')}
      <ArrowRight className="h-4 w-4" />
    </Link>
  </div>
);

const renderMonthComparison = (props: Props, t: TFunc) => {
  if (props.spentLastMonthToDate <= 0) {
    return null;
  }

  const delta = props.spentThisMonth - props.spentLastMonthToDate;
  const amount = formatCurrency(Math.abs(delta), props.currency);

  return (
    <p className="mt-1 text-sm font-semibold opacity-85">
      {t(getComparisonKey(delta, props.spentLastMonthToDate), { amount })}
    </p>
  );
};

// Under a twentieth of last month's pace either way is noise, not a signal.
const getComparisonKey = (delta: number, reference: number): string => {
  if (Math.abs(delta) < reference * 0.05) {
    return 'today.comparedLastMonth.same';
  }
  if (delta > 0) {
    return 'today.comparedLastMonth.more';
  }

  return 'today.comparedLastMonth.less';
};

const renderGuidance = (props: Props, t: TFunc) => {
  if (props.safeToSpend === null) {
    return renderNoBudgetGuidance(props, t);
  }

  return (
    <div className="mt-5">
      <TodayAmount amount={props.safeToSpend} currency={props.currency} />
      <p className="mt-2 max-w-lg text-sm leading-relaxed opacity-70">
        {renderSafeLabel(props.safeToSpend, props.upcomingThisMonth, t)}
      </p>
      {renderDailyAllowance(props.dailyAllowance, props.currency, t)}
      {renderRecovery(props, t)}
    </div>
  );
};

// Over plan there is no allowance left to quote. Rather than stopping at the
// verdict, say what an ordinary day costs this person and how many are left —
// information they can act on, with nothing to feel caught out by. A month
// already past its plan cannot be undone; the days remaining are the part
// still in their hands.
const renderRecovery = (props: Props, t: TFunc) => {
  if (props.safeToSpend === null || props.safeToSpend >= 0) {
    return null;
  }
  if (props.typicalDay === null || props.daysRemaining <= 0) {
    return null;
  }

  return (
    <p className="mt-1 text-sm font-semibold opacity-85">
      {t('today.recovery', {
        amount: formatCurrency(props.typicalDay, props.currency),
        count: props.daysRemaining,
      })}
    </p>
  );
};

const renderSafeLabel = (safeToSpend: number, upcoming: number, t: TFunc) => {
  if (safeToSpend < 0) {
    return t('today.overPlan');
  }
  if (upcoming > 0) {
    return t('today.leftAfterBills');
  }

  return t('today.leftThisMonth');
};

const renderDailyAllowance = (
  dailyAllowance: number | null,
  currency: string,
  t: TFunc,
) => {
  if (dailyAllowance === null || dailyAllowance <= 0) {
    return null;
  }

  return (
    <p className="mt-1 text-sm font-semibold opacity-85">
      {t('today.perDay', {
        amount: formatCurrency(dailyAllowance, currency),
      })}
    </p>
  );
};

const getHeroTone = (status: TodayStatus): string => {
  if (status === 'tight') {
    return 'today-hero-tight';
  }
  if (status === 'watchful') {
    return 'today-hero-watchful';
  }
  if (status === 'noBudget') {
    return 'today-hero-neutral';
  }

  return 'today-hero-comfortable';
};
