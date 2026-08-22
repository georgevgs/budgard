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

    const interestThisMonth = new Map<string, number>();
    const paymentThisMonth = new Map<string, number>();

    const daysThisMonth = getDaysInMonth(monthDate(now, month - 1));

    for (const s of active) {
      const interest = roundMoney(
        (s.remaining * s.debt.apr * daysThisMonth) / 100 / 365,
      );
      interestThisMonth.set(s.debt.id, interest);
      s.remaining = roundMoney(s.remaining + interest);
      s.totalInterest = roundMoney(s.totalInterest + interest);
      paymentThisMonth.set(s.debt.id, 0);
    }

    let extraPool = input.monthlyExtra;

    // Recycle minimum payments from debts that finished in PRIOR months —
    // the user's actual monthly budget is freed up by their payoff.
    for (const s of states) {
      if (s.payoffMonth !== null && s.payoffMonth < month) {
        extraPool += s.debt.minimum_payment;
      }
    }

    for (const s of active) {
      const min = Math.min(s.debt.minimum_payment, s.remaining);
      s.remaining -= min;
      s.totalPaid += min;
      paymentThisMonth.set(s.debt.id, min);
      // If the minimum overshot the balance, the leftover cascades into
      // the priority-sorted extra pool below.
      extraPool += s.debt.minimum_payment - min;
    }

    const stillActive = active.filter((s) => s.remaining > 0);
    if (input.strategy === 'snowball') {
      stillActive.sort((a, b) => a.remaining - b.remaining);
    } else {
      stillActive.sort((a, b) => b.debt.apr - a.debt.apr);
    }

    for (const s of stillActive) {
      if (extraPool <= 0) break;
      const applied = Math.min(extraPool, s.remaining);
      s.remaining -= applied;
      s.totalPaid += applied;
      paymentThisMonth.set(
        s.debt.id,
        (paymentThisMonth.get(s.debt.id) ?? 0) + applied,
      );
      extraPool -= applied;
    }

    for (const s of active) {
      if (s.remaining <= 0 && s.payoffMonth === null) {
        s.payoffMonth = month;
        s.remaining = 0;
      }
    }

    const payments: DebtMonth[] = active.map((s) => {
      const payment = roundMoney(paymentThisMonth.get(s.debt.id) ?? 0);
      const interest = interestThisMonth.get(s.debt.id) ?? 0;

      return {
        debtId: s.debt.id,
        payment,
        interest,
        principal: roundMoney(payment - interest),
        remaining: s.remaining,
      };
    });

    const totalRemaining = sumAmounts(active.map((s) => s.remaining));
    schedule.push({ month, payments, totalRemaining });
  }

  const finished = states.every((s) => s.remaining <= 0);
  const unpayable = !finished;
  let monthsToPayoff = MAX_MONTHS;
  if (!unpayable) {
    monthsToPayoff = Math.max(...states.map((s) => s.payoffMonth ?? 0));
  }

  const totalInterestPaid = sumAmounts(states.map((s) => s.totalInterest));
  const totalPaid = sumAmounts(states.map((s) => s.totalPaid));

  const payoffDate = toIsoDate(addMonthsClamped(now, monthsToPayoff));

  const perDebtPayoffMonth: Record<string, number> = {};
  const perDebtTotalInterest: Record<string, number> = {};
  for (const s of states) {
    perDebtPayoffMonth[s.debt.id] = s.payoffMonth ?? monthsToPayoff;
    perDebtTotalInterest[s.debt.id] = s.totalInterest;
  }

  return {
    monthsToPayoff,
    totalInterestPaid,
    totalPaid,
    payoffDate,
    perDebtPayoffMonth,
    perDebtTotalInterest,
    schedule,
    unpayable,
  };
};

export const compareStrategies = (
  debts: Debt[],
  monthlyExtra: number,
  now?: Date,
) => ({
  snowball: simulatePayoff({ debts, monthlyExtra, strategy: 'snowball', now }),
  avalanche: simulatePayoff({ debts, monthlyExtra, strategy: 'avalanche', now }),
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
