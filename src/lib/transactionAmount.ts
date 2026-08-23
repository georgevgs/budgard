import { formatCurrency } from '@/lib/utils';

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

// --- Helpers ---

const isMoneyIn = (amount: number, kind: TransactionKind): boolean => {
  if (kind === 'income') {
    return true;
  }

  return amount < 0;
};
