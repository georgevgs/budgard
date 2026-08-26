import { getDaysInMonth } from 'date-fns';
import { roundMoney, sumAmounts } from '@/lib/money';
import { toIsoDate } from '@/lib/dates';
import type { Debt, PayoffStrategy } from '@/types/Debt';

// Pure payoff simulation. Month-by-month:
//   1. Accrue interest on each active debt for the days in that calendar
//      month at the daily periodic rate (apr/365).
//   2. Apply each debt's minimum payment.
//   3. Sort remaining debts by strategy (snowball = lowest balance,
//      avalanche = highest APR) and throw monthlyExtra + freed-up minimums
//      from already-paid-off debts at the top of the list, cascading overflow.
//   4. Stop when all balances reach zero, or after MAX_MONTHS as a safety cap.
//
// The accrual convention is daily simple interest at apr/365 across the days
// of each calendar month, which is what recompute_debt_balance does in
// 20260822000001_debt_balance_freshness.sql. It used to be apr/12 here and
// apr/365 there, so the planner's projection could never be reconciled against
// the balance the app actually tracks. Real month lengths are used rather than
// a 30-day average for the same reason: the two have to agree exactly.

type DebtMonth = {
  debtId: string;
  payment: number;
  // Interest ACCRUED this month, not the interest portion of the payment.
  // Capping it at the payment made the schedule's interest column sum to less
  // than the reported total whenever a minimum failed to cover a month's
  // interest — which is exactly the case the planner warns about.
  interest: number;
  // payment - interest. Negative when the payment did not cover the interest,
  // which is what negative amortization looks like and is worth showing.
  principal: number;
  remaining: number;
};

type ScheduleEntry = {
  month: number;
  payments: DebtMonth[];
  totalRemaining: number;
};

export type SimResult = {
  monthsToPayoff: number;
  totalInterestPaid: number;
  totalPaid: number;
  payoffDate: string;
  perDebtPayoffMonth: Record<string, number>;
  perDebtTotalInterest: Record<string, number>;
  schedule: ScheduleEntry[];
  unpayable: boolean;
};

export type SimInput = {
  debts: Debt[];
  monthlyExtra: number;
  strategy: PayoffStrategy;
  /** Injectable clock so month lengths and the payoff date are testable. */
  now?: Date;
};

const MAX_MONTHS = 600;

const cloneState = (debt: Debt) => ({
  debt,
  remaining: debt.current_balance,
  totalInterest: 0,
  totalPaid: 0,
  payoffMonth: null as number | null,
});

const emptyResult = (now: Date): SimResult => ({
  monthsToPayoff: 0,
  totalInterestPaid: 0,
  totalPaid: 0,
  payoffDate: toIsoDate(now),
  perDebtPayoffMonth: {},
  perDebtTotalInterest: {},
  schedule: [],
  unpayable: false,
});

export const simulatePayoff = (input: SimInput): SimResult => {
  const now = input.now ?? new Date();
  const states = input.debts
    .filter((d) => d.current_balance > 0 && !d.is_archived && !d.is_completed)
    .map(cloneState);

  if (states.length === 0) {
    return emptyResult(now);
  }

  const schedule: ScheduleEntry[] = [];

  for (let month = 1; month <= MAX_MONTHS; month++) {
    const active = states.filter((s) => s.remaining > 0);
    if (active.length === 0) break;

    const payments = new Map<string, number>(active.map((s) => [s.debt.id, 0]));
    const daysThisMonth = getDaysInMonth(monthDate(now, month - 1));
    const interest = accrueInterest(active, daysThisMonth);

    // The extra pool is threaded through each phase rather than summed at the
    // end, so the additions happen in the same order they always have — these
    // are floating-point sums feeding a schedule that has to reconcile.
    let pool = addFreedMinimums(input.monthlyExtra, states, month);
    pool = payMinimums(active, payments, pool);
    payByStrategy(active, input.strategy, payments, pool);

    markPaidOff(active, month);

    schedule.push({
      month,
      payments: buildMonthRows(active, payments, interest),
      totalRemaining: sumAmounts(active.map((s) => s.remaining)),
    });
  }

  return summarise(states, schedule, now);
};

export const compareStrategies = (
  debts: Debt[],
  monthlyExtra: number,
  now?: Date,
) => ({
  snowball: simulatePayoff({ debts, monthlyExtra, strategy: 'snowball', now }),
  avalanche: simulatePayoff({
    debts,
    monthlyExtra,
    strategy: 'avalanche',
    now,
  }),
});

// "Your minimum payment doesn't cover monthly interest, so this debt grows
// each month if you pay only the minimum." Used in the per-debt UI as a
// warning callout.
export const minimumCoversInterest = (
  debt: Debt,
  now: Date = new Date(),
): boolean => {
  if (debt.current_balance <= 0) return true;

  // Same daily convention as the simulation and the database, measured over
  // the current month so the warning matches what will actually be charged.
  const days = getDaysInMonth(now);
  const monthlyInterest = roundMoney(
    (debt.current_balance * debt.apr * days) / 100 / 365,
  );

  return debt.minimum_payment >= monthlyInterest;
};

// --- Helpers ---

// The calendar month `offset` months after `now`, used for its length.
const monthDate = (now: Date, offset: number): Date => {
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
};

// setMonth OVERFLOWS rather than clamping: 31 Jan plus one month lands on
// 3 March. Building the month first and clamping the day into it gives the
// date a person would name.
const addMonthsClamped = (date: Date, months: number): Date => {
  const monthStart = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = getDaysInMonth(monthStart);

  return new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    Math.min(date.getDate(), lastDay),
  );
};

// --- Simulation phases ---
//
// Each takes the month's active debts and mutates their running state. They are
// split out so the month loop above reads as the four things a month does:
// interest accrues, minimums are paid, whatever is left is thrown at the
// strategy's top debt, and anything that hit zero is marked done.

type DebtState = ReturnType<typeof cloneState>;

// Adds this month's interest to each balance and returns what was accrued per
// debt, for the schedule's interest column.
const accrueInterest = (
  active: DebtState[],
  daysThisMonth: number,
): Map<string, number> => {
  const accrued = new Map<string, number>();

  for (const s of active) {
    const interest = roundMoney(
      (s.remaining * s.debt.apr * daysThisMonth) / 100 / 365,
    );
    accrued.set(s.debt.id, interest);
    s.remaining = roundMoney(s.remaining + interest);
    s.totalInterest = roundMoney(s.totalInterest + interest);
  }

  return accrued;
};

// Recycle minimum payments from debts that finished in PRIOR months — the
// user's actual monthly budget is freed up by their payoff.
const addFreedMinimums = (
  pool: number,
  states: DebtState[],
  month: number,
): number => {
  let next = pool;

  for (const s of states) {
    if (s.payoffMonth !== null && s.payoffMonth < month) {
      next += s.debt.minimum_payment;
    }
  }

  return next;
};

// Pays each debt's minimum. Returns the pool grown by any minimum that
// overshot its balance — that leftover cascades into the priority-sorted pass.
const payMinimums = (
  active: DebtState[],
  payments: Map<string, number>,
  pool: number,
): number => {
  let next = pool;

  for (const s of active) {
    const min = Math.min(s.debt.minimum_payment, s.remaining);
    s.remaining -= min;
    s.totalPaid += min;
    payments.set(s.debt.id, min);
    next += s.debt.minimum_payment - min;
  }

  return next;
};

// Throws the pool at the debts in strategy order, cascading the overflow.
const payByStrategy = (
  active: DebtState[],
  strategy: PayoffStrategy,
  payments: Map<string, number>,
  pool: number,
): void => {
  const stillActive = active.filter((s) => s.remaining > 0);
  if (strategy === 'snowball') {
    stillActive.sort((a, b) => a.remaining - b.remaining);
  } else {
    stillActive.sort((a, b) => b.debt.apr - a.debt.apr);
  }

  let left = pool;
  for (const s of stillActive) {
    if (left <= 0) break;
    const applied = Math.min(left, s.remaining);
    s.remaining -= applied;
    s.totalPaid += applied;
    payments.set(s.debt.id, (payments.get(s.debt.id) ?? 0) + applied);
    left -= applied;
  }
};

const markPaidOff = (active: DebtState[], month: number): void => {
  for (const s of active) {
    if (s.remaining <= 0 && s.payoffMonth === null) {
      s.payoffMonth = month;
      s.remaining = 0;
    }
  }
};

const buildMonthRows = (
  active: DebtState[],
  payments: Map<string, number>,
  accrued: Map<string, number>,
): DebtMonth[] => {
  return active.map((s) => {
    const payment = roundMoney(payments.get(s.debt.id) ?? 0);
    const interest = accrued.get(s.debt.id) ?? 0;

    return {
      debtId: s.debt.id,
      payment,
      interest,
      principal: roundMoney(payment - interest),
      remaining: s.remaining,
    };
  });
};

const summarise = (
  states: DebtState[],
  schedule: ScheduleEntry[],
  now: Date,
): SimResult => {
  const unpayable = !states.every((s) => s.remaining <= 0);
  let monthsToPayoff = MAX_MONTHS;
  if (!unpayable) {
    monthsToPayoff = Math.max(...states.map((s) => s.payoffMonth ?? 0));
  }

  const perDebtPayoffMonth: Record<string, number> = {};
  const perDebtTotalInterest: Record<string, number> = {};
  for (const s of states) {
    perDebtPayoffMonth[s.debt.id] = s.payoffMonth ?? monthsToPayoff;
    perDebtTotalInterest[s.debt.id] = s.totalInterest;
  }

  return {
    monthsToPayoff,
    totalInterestPaid: sumAmounts(states.map((s) => s.totalInterest)),
    totalPaid: sumAmounts(states.map((s) => s.totalPaid)),
    payoffDate: toIsoDate(addMonthsClamped(now, monthsToPayoff)),
    perDebtPayoffMonth,
    perDebtTotalInterest,
    schedule,
    unpayable,
  };
};
