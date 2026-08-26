import { useState } from 'react';

// The schema caps a single expense at 1,000,000, so the pad stops accepting
// digits at the same ceiling rather than letting someone type a number the
// form will reject after the fact.
const MAX_CENTS = 100_000_000;

export type AmountPad = {
  cents: number;
  amount: number;
  isEmpty: boolean;
  setAmount: (amount: number) => void;
  press: (digit: number) => void;
  backspace: () => void;
  clear: () => void;
};

/**
 * Money keypads fill from the right: every digit is a cent, and the decimal
 * point places itself. Typing 1-2-8-0 gives 12.80.
 *
 * The alternative — a free-text field with a decimal key — makes the user
 * think about separators that differ by locale (12.80 or 12,80) and lets them
 * type things like "1.2.3" that have to be rejected afterwards. Filling from
 * the right cannot produce an invalid number at all.
 */
export const useAmountPad = (initialCents = 0): AmountPad => {
  const [cents, setCents] = useState(initialCents);

  return {
    cents,
    amount: cents / 100,
    isEmpty: cents === 0,
    setAmount: (amount: number) => {
      const nextCents = Math.round(amount * 100);
      if (nextCents < 0 || nextCents > MAX_CENTS) {
        return;
      }

      setCents(nextCents);
    },
    press: (digit: number) => {
      setCents((current) => {
        const next = current * 10 + digit;
        if (next > MAX_CENTS) {
          return current;
        }

        return next;
      });
    },
    backspace: () => setCents((current) => Math.floor(current / 10)),
    clear: () => setCents(0),
  };
};
