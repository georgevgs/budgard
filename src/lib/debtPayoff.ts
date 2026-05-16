import type { Debt, PayoffStrategy } from '@/types/Debt';

// Pure payoff simulation. Month-by-month:
//   1. Accrue monthly interest on each active debt (apr/12).
//   2. Apply each debt's minimum payment.
//   3. Sort remaining debts by strategy (snowball = lowest balance,
//      avalanche = highest APR) and throw monthlyExtra + freed-up minimums
//      from already-paid-off debts at the top of the list, cascading overflow.
//   4. Stop when all balances reach zero, or after MAX_MONTHS as a safety cap.

export type DebtMonth = {
  debtId: string;
  payment: number;
  principal: number;
  interest: number;
  remaining: number;
};

export type ScheduleEntry = {
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
};

const MAX_MONTHS = 600;

const cloneState = (debt: Debt) => ({
  debt,
  remaining: debt.current_balance,
  totalInterest: 0,
  totalPaid: 0,
  payoffMonth: null as number | null,
});

const emptyResult = (): SimResult => ({
  monthsToPayoff: 0,
  totalInterestPaid: 0,
  totalPaid: 0,
  payoffDate: new Date().toISOString().slice(0, 10),
  perDebtPayoffMonth: {},
  perDebtTotalInterest: {},
  schedule: [],
  unpayable: false,
});

export const simulatePayoff = (input: SimInput): SimResult => {
  const states = input.debts
    .filter((d) => d.current_balance > 0 && !d.is_archived && !d.is_completed)
    .map(cloneState);

  if (states.length === 0) {
    return emptyResult();
  }

  const schedule: ScheduleEntry[] = [];

  for (let month = 1; month <= MAX_MONTHS; month++) {
    const active = states.filter((s) => s.remaining > 0);
    if (active.length === 0) break;

    const interestThisMonth = new Map<string, number>();
    const paymentThisMonth = new Map<string, number>();

    for (const s of active) {
      const interest = (s.remaining * s.debt.apr) / 100 / 12;
      interestThisMonth.set(s.debt.id, interest);
      s.remaining += interest;
      s.totalInterest += interest;
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
      const payment = paymentThisMonth.get(s.debt.id) ?? 0;
      const interest = Math.min(payment, interestThisMonth.get(s.debt.id) ?? 0);
      const principal = Math.max(payment - interest, 0);

      return {
        debtId: s.debt.id,
        payment,
        principal,
        interest,
        remaining: s.remaining,
      };
    });

    const totalRemaining = active.reduce((acc, s) => acc + s.remaining, 0);
    schedule.push({ month, payments, totalRemaining });
  }

  const finished = states.every((s) => s.remaining <= 0);
  const unpayable = !finished;
  let monthsToPayoff = MAX_MONTHS;
  if (!unpayable) {
    monthsToPayoff = Math.max(...states.map((s) => s.payoffMonth ?? 0));
  }

  const totalInterestPaid = states.reduce((acc, s) => acc + s.totalInterest, 0);
  const totalPaid = states.reduce((acc, s) => acc + s.totalPaid, 0);

  const payoffDate = addMonths(new Date(), monthsToPayoff)
    .toISOString()
    .slice(0, 10);

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

export const compareStrategies = (debts: Debt[], monthlyExtra: number) => ({
  snowball: simulatePayoff({ debts, monthlyExtra, strategy: 'snowball' }),
  avalanche: simulatePayoff({ debts, monthlyExtra, strategy: 'avalanche' }),
});

// "Your minimum payment doesn't cover monthly interest, so this debt grows
// each month if you pay only the minimum." Used in the per-debt UI as a
// warning callout.
export const minimumCoversInterest = (debt: Debt): boolean => {
  if (debt.current_balance <= 0) return true;

  const monthlyInterest = (debt.current_balance * debt.apr) / 100 / 12;
  return debt.minimum_payment >= monthlyInterest;
};

// --- Helpers ---

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date.getTime());
  result.setMonth(result.getMonth() + months);

  return result;
};
