import { getDaysInMonth } from 'date-fns';
import { anchorDayOf } from '@/constants/dates';
import { roundMoney, sumAmounts } from '@/constants/money';
import type { Debt, DebtPayment } from '@/types/Debt';

// How a debt payment is counted outside the debt tracker.
//
// A credit card payment is a transfer. The purchases behind it were the
// spending, and they are already logged, so counting the payment as well would
// count the same money twice. Every budgeting tool treats it that way.
//
// A loan payment is different. Nothing else in the ledger stands for it, and
// the money leaves the account like any bill, so it is an outflow of the budget
// and of cash. It is still not spending: the principal part pays down a
// liability and consumes nothing, so spending analytics leave it out.
//
// Only debts in the default currency are counted. Payments are stored in the
// debt's own currency and these totals have no rate to convert them with.
const countsAsOutflow = (debt: Debt, defaultCurrency: string): boolean =>
  'credit_card' !== debt.kind && defaultCurrency === debt.currency;

const paymentsOf = (debt: Debt): DebtPayment[] => debt.payments ?? [];

/** Every loan payment, dated, for totals that bucket by month. */
export const collectLoanPayments = (
  debts: Debt[],
  defaultCurrency: string,
): DebtPayment[] =>
  debts
    .filter((debt) => countsAsOutflow(debt, defaultCurrency))
    .flatMap(paymentsOf);

/** What went to loans in one `yyyy-MM` month. */
export const sumLoanPaymentsInMonth = (
  debts: Debt[],
  defaultCurrency: string,
  monthKey: string,
): number =>
  sumAmounts(
    collectLoanPayments(debts, defaultCurrency)
      .filter((payment) => monthKey === payment.date.slice(0, 7))
      .map((payment) => payment.amount),
  );

/**
 * A month of loan payments in the terms of the 50/30/20 rule: the minimum is a
 * need, anything paid above it is debt repayment, which the rule files with
 * savings.
 */
export const splitLoanPaymentsInMonth = (
  debts: Debt[],
  defaultCurrency: string,
  monthKey: string,
): { minimums: number; extra: number } => {
  const perDebt = debts
    .filter((debt) => countsAsOutflow(debt, defaultCurrency))
    .map((debt) => {
      const paid = sumAmounts(
        paymentsOf(debt)
          .filter((payment) => monthKey === payment.date.slice(0, 7))
          .map((payment) => payment.amount),
      );
      const minimum = Math.min(paid, Math.max(debt.minimum_payment, 0));

      return { minimum, extra: Math.max(paid - minimum, 0) };
    });

  return {
    minimums: sumAmounts(perDebt.map((entry) => entry.minimum)),
    extra: sumAmounts(perDebt.map((entry) => entry.extra)),
  };
};

export type LoanOutflow = {
  /** Minimums not yet paid in the month in progress. */
  restOfMonth: number;
  /** Minimums for each of the twelve months after it. */
  months: number[];
};

const PROJECTED_MONTHS = 12;

/**
 * What loans take out of a month's budget: the payments logged in it and, for
 * the month in progress, the minimums still due. Everyday pace is measured on
 * what is left after it, as it is after the bills.
 */
export const sumLoanCostsInMonth = (
  debts: Debt[],
  defaultCurrency: string,
  month: Date,
  isCurrentMonth: boolean,
): number => {
  const paid = sumLoanPaymentsInMonth(
    debts,
    defaultCurrency,
    toMonthKey(month),
  );

  if (isCurrentMonth) {
    return sumAmounts([
      paid,
      ...collectLoanMinimumsDue(debts, defaultCurrency, month).map(
        (due) => due.amount,
      ),
    ]);
  } else {
    return paid;
  }
};

export type LoanMinimumDue = {
  id: string;
  description: string;
  amount: number;
  date: Date;
};

/**
 * What is left of this month's minimum for each loan, on the day it falls due.
 *
 * The due day is the day of the month the debt started on, clamped to short
 * months. A loan is settled once its payments this month reach the minimum.
 * The push reminder keeps its own rule, any payment this month stops it.
 */
export const collectLoanMinimumsDue = (
  debts: Debt[],
  defaultCurrency: string,
  now: Date,
): LoanMinimumDue[] => {
  const monthKey = toMonthKey(now);

  return trackedLoans(debts, defaultCurrency)
    .filter((debt) => false === isSettledInMonth(debt, monthKey))
    .map((debt) => ({
      id: debt.id,
      description: debt.name,
      amount: remainingMinimum(debt, now, monthKey),
      date: dueDateIn(debt, now),
    }))
    .filter((due) => 0 < due.amount);
};

/**
 * The loan minimums still to be paid, month by month, until each loan is gone.
 */
export const projectLoanOutflow = (
  debts: Debt[],
  defaultCurrency: string,
  now: Date,
): LoanOutflow => {
  const monthKey = toMonthKey(now);
  const loans = trackedLoans(debts, defaultCurrency);
  const schedules = loans.map((debt) =>
    scheduleMinimums(debt, now, false === isSettledInMonth(debt, monthKey)),
  );

  return {
    restOfMonth: sumAmounts(
      loans.map((debt) => remainingMinimum(debt, now, monthKey)),
    ),
    months: Array.from({ length: PROJECTED_MONTHS }, (_, index) =>
      sumAmounts(schedules.map((schedule) => schedule.months[index])),
    ),
  };
};

// Only loans already paid through the tracker have a minimum counted ahead.
// Someone who pays a loan as a recurring bill has that bill in the plan
// already, and has no payment rows here, so the same instalment is never
// counted twice.
const trackedLoans = (debts: Debt[], defaultCurrency: string): Debt[] =>
  debts.filter(
    (debt) =>
      countsAsOutflow(debt, defaultCurrency) &&
      false === debt.is_completed &&
      0 < debt.current_balance &&
      0 < paymentsOf(debt).length,
  );

const paidInMonth = (debt: Debt, monthKey: string): number =>
  sumAmounts(
    paymentsOf(debt)
      .filter((payment) => monthKey === payment.date.slice(0, 7))
      .map((payment) => payment.amount),
  );

const isSettledInMonth = (debt: Debt, monthKey: string): boolean =>
  Math.max(debt.minimum_payment, 0) <= paidInMonth(debt, monthKey);

const remainingMinimum = (debt: Debt, now: Date, monthKey: string): number =>
  roundMoney(
    Math.max(
      scheduleMinimums(debt, now, true).restOfMonth -
        paidInMonth(debt, monthKey),
      0,
    ),
  );

const dueDateIn = (debt: Debt, now: Date): Date =>
  new Date(
    now.getFullYear(),
    now.getMonth(),
    Math.min(anchorDayOf(debt.start_date), getDaysInMonth(now)),
  );

type Step = { balance: number; payments: number[] };

// Daily simple interest at apr/365 over each calendar month, then the minimum,
// the convention recompute_debt_balance and the payoff planner share.
const scheduleMinimums = (
  debt: Debt,
  now: Date,
  isDueThisMonth: boolean,
): LoanOutflow => {
  const firstOffset = firstOffsetFor(isDueThisMonth);
  const offsets = Array.from(
    { length: PROJECTED_MONTHS + 1 - firstOffset },
    (_, index) => firstOffset + index,
  );
  const walked = offsets.reduce<Step>(
    (step, offset) => {
      const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const owed = roundMoney(
        step.balance +
          (step.balance * debt.apr * getDaysInMonth(month)) / 100 / 365,
      );
      const payment = Math.min(Math.max(debt.minimum_payment, 0), owed);

      return {
        balance: roundMoney(owed - payment),
        payments: [...step.payments, payment],
      };
    },
    { balance: debt.current_balance, payments: [] },
  );
  const leading = Array.from({ length: firstOffset }, () => 0);
  const [restOfMonth, ...months] = [...leading, ...walked.payments];

  return { restOfMonth, months };
};

const firstOffsetFor = (isDueThisMonth: boolean): number => {
  if (isDueThisMonth) {
    return 0;
  } else {
    return 1;
  }
};

const toMonthKey = (date: Date): string =>
  `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
