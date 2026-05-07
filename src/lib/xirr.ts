import { parseISO } from 'date-fns';
import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';

// XIRR (irregular cashflow internal rate of return). Cashflow sign convention:
// money out of pocket = negative, money received = positive.
// A deposit into an investment is therefore a negative cashflow; the current
// account value is treated as a positive cashflow on the latest known date.
export type Cashflow = {
  date: Date;
  amount: number;
}

const DAYS_PER_YEAR = 365;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const NEWTON_ITERATIONS = 50;
const BISECTION_ITERATIONS = 200;
const TOLERANCE = 1e-7;
const MIN_RATE = -0.9999;
const MAX_RATE = 100;
// Annualizing returns from a tiny window produces nonsense (a +1% gain over
// one day annualizes to ~3,650%). Investment-account XIRR is suppressed below
// this span so the UI doesn't surface those numbers as "per year". 90 days is
// the conservative threshold most retail brokerages use before showing an
// annualized rate.
const MIN_ANNUALIZATION_DAYS = 90;

const yearsBetween = (later: Date, earlier: Date): number => {
  return (later.getTime() - earlier.getTime()) / MS_PER_DAY / DAYS_PER_YEAR;
};

const npv = (rate: number, sorted: Cashflow[]): number => {
  const t0 = sorted[0].date;
  let total = 0;
  for (const cf of sorted) {
    const years = yearsBetween(cf.date, t0);
    total += cf.amount / Math.pow(1 + rate, years);
  }

  return total;
};

const npvDerivative = (rate: number, sorted: Cashflow[]): number => {
  const t0 = sorted[0].date;
  let total = 0;
  for (const cf of sorted) {
    const years = yearsBetween(cf.date, t0);
    if (years === 0) {
      continue;
    }
    total += (-cf.amount * years) / Math.pow(1 + rate, years + 1);
  }

  return total;
};

const newtonRaphson = (sorted: Cashflow[], guess: number): number | null => {
  let rate = guess;

  for (let i = 0; i < NEWTON_ITERATIONS; i++) {
    if (rate <= MIN_RATE) {
      rate = MIN_RATE;
    }
    const value = npv(rate, sorted);
    if (Math.abs(value) < TOLERANCE) {
      return rate;
    }
    const slope = npvDerivative(rate, sorted);
    if (Math.abs(slope) < 1e-12) {
      return null;
    }
    const next = rate - value / slope;
    if (!Number.isFinite(next)) {
      return null;
    }
    rate = next;
  }

  return null;
};

const bisection = (sorted: Cashflow[]): number | null => {
  let lo = MIN_RATE;
  let hi = MAX_RATE;
  let fLo = npv(lo, sorted);
  let fHi = npv(hi, sorted);
  if (fLo * fHi > 0) {
    return null;
  }

  for (let i = 0; i < BISECTION_ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, sorted);
    if (Math.abs(fMid) < TOLERANCE) {
      return mid;
    }
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
      continue;
    }
    lo = mid;
    fLo = fMid;
  }

  return null;
};

export const xirr = (cashflows: Cashflow[], guess = 0.1): number | null => {
  if (cashflows.length < 2) {
    return null;
  }

  let hasPositive = false;
  let hasNegative = false;
  for (const cf of cashflows) {
    if (cf.amount > 0) hasPositive = true;
    if (cf.amount < 0) hasNegative = true;
  }
  if (!hasPositive || !hasNegative) {
    return null;
  }

  const sorted = [...cashflows].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  const span = yearsBetween(sorted[sorted.length - 1].date, sorted[0].date);
  if (span <= 0) {
    return null;
  }

  const newton = newtonRaphson(sorted, guess);
  if (newton !== null && Number.isFinite(newton) && newton > MIN_RATE) {
    return newton;
  }

  return bisection(sorted);
};

// Builds the cashflow series for an investment account from its snapshot
// history and current value. Each contribution_delta becomes a cashflow on
// its snapshot date; the current_balance is the terminal positive cashflow.
export const computeAccountXirr = (
  account: Account,
  snapshots: AccountBalance[],
): number | null => {
  if (account.kind !== 'investment') {
    return null;
  }
  if (account.current_balance <= 0) {
    return null;
  }

  const sorted = [...snapshots].sort((a, b) =>
    a.recorded_at.localeCompare(b.recorded_at),
  );
  const cashflows: Cashflow[] = [];
  for (const snap of sorted) {
    const delta = snap.contribution_delta;
    if (delta == null || delta === 0) {
      continue;
    }
    cashflows.push({
      date: parseISO(snap.recorded_at),
      amount: -delta,
    });
  }

  if (cashflows.length === 0) {
    return null;
  }

  const lastDate =
    sorted.length > 0
      ? parseISO(sorted[sorted.length - 1].recorded_at)
      : new Date();
  cashflows.push({ date: lastDate, amount: account.current_balance });

  const firstCashflowDate = cashflows.reduce(
    (earliest, cf) => (cf.date < earliest ? cf.date : earliest),
    cashflows[0].date,
  );
  const spanDays = (lastDate.getTime() - firstCashflowDate.getTime()) / MS_PER_DAY;
  if (spanDays < MIN_ANNUALIZATION_DAYS) {
    return null;
  }

  return xirr(cashflows);
};
