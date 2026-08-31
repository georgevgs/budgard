import { formatCurrency } from '@/lib/utils';
import { convertMoney } from '@/lib/money';
import type { Expense } from '@/types/Expense';

/**
 * How a transaction's amount is written, in one place.
 *
 * There are three cases, not two. Income is money in and expense is money
 * out — but an expense is allowed to be NEGATIVE here: a refund is stored as
 * `amount: -x` against the original charge (see `useRefundDialog`), and a
 * split works the same way. That third case used to fall through the
 * expense branch, which prefixed a minus onto a number that already had one
 * and produced `−-24,50€` — or, if the caller reached for `Math.abs` to tidy
 * that up, the far worse `−24,50€`: money that came BACK, reported as spent.
 *
 * So the sign is decided by the direction the money actually moved, and the
 * magnitude is always written unsigned.
 */

export type TransactionKind = 'expense' | 'income';

export type AmountDisplay = {
  /** Already includes the sign; never concatenate another one. */
  text: string;
  /** Tailwind class for the tone that sign implies. */
  tone: string;
};

type CurrencyConversion = {
  defaultCurrency: string;
  selectedCurrency: string;
  ensureRate: () => Promise<number>;
};

export type StoredTransactionAmount = {
  amount: number;
  original_amount: number | null;
  original_currency: string | null;
  exchange_rate: number | null;
};

export const describeAmount = (
  amount: number,
  kind: TransactionKind,
  currency: string,
): AmountDisplay => {
  const magnitude = formatCurrency(Math.abs(amount), currency);

  if (isMoneyIn(amount, kind)) {
    return { text: `+${magnitude}`, tone: 'text-income-ink' };
  }

  return { text: `−${magnitude}`, tone: 'text-foreground' };
};

export const prepareStoredTransactionAmount = async (
  rawAmount: number,
  conversion: CurrencyConversion,
): Promise<StoredTransactionAmount> => {
  if (conversion.selectedCurrency === conversion.defaultCurrency) {
    return {
      amount: rawAmount,
      original_amount: null,
      original_currency: null,
      exchange_rate: null,
    };
  }

  const exchangeRate = await conversion.ensureRate();

  return {
    amount: convertMoney(rawAmount, exchangeRate, conversion.defaultCurrency),
    original_amount: rawAmount,
    original_currency: conversion.selectedCurrency,
    exchange_rate: exchangeRate,
  };
};

// Editing a foreign transaction shows the figure the user originally entered,
// rounded and masked in that currency's minor unit rather than today's default.
export const resolveSourceCurrency = (
  transaction: Expense,
  defaultCurrency: string,
): string => {
  if (
    transaction.original_currency &&
    transaction.original_currency !== defaultCurrency
  ) {
    return transaction.original_currency;
  }

  return defaultCurrency;
};

export const resolveSourceAmount = (
  transaction: Expense,
  defaultCurrency: string,
): number => {
  const sourceCurrency = resolveSourceCurrency(transaction, defaultCurrency);
  if (sourceCurrency !== defaultCurrency) {
    return transaction.original_amount ?? transaction.amount;
  }

  return transaction.amount;
};

// --- Helpers ---

const isMoneyIn = (amount: number, kind: TransactionKind): boolean => {
  if (kind === 'income') {
    return true;
  }

  return amount < 0;
};
