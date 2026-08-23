import { useMemo } from 'react';
import { getDaysInMonth, subDays } from 'date-fns';
import { countsAsSpending } from '@/lib/spending';
import { toIsoDate } from '@/lib/dates';
import type { Expense } from '@/types/Expense';

export type PaceDay = {
  date: string;
  amount: number;
  /** Cost more than an ordinary day is allowed to. The bar goes accent. */
  isOverPace: boolean;
};

export type DailyPace = {
  days: PaceDay[];
  dayOfMonth: number;
  daysInMonth: number;
  /** Tallest bar in the window, so the tile can scale against something. */
  peak: number;
};

const WINDOW = 7;

/**
 * The last seven days as one bar each, and which of them cost more than the
 * allowance allows. The window is fixed rather than month-to-date so the tile
 * is the same shape on the 2nd as on the 28th — a chart that grows a bar a day
 * is unreadable for the first week of every month.
 */
export const useDailyPace = (
  expenses: Expense[],
  dailyAllowance: number | null,
  now: Date,
): DailyPace => {
  return useMemo(() => {
    const totals = new Map<string, number>();
    for (const expense of expenses) {
      if (!countsAsSpending(expense)) {
        continue;
      }
      totals.set(
        expense.date,
        (totals.get(expense.date) ?? 0) + expense.amount,
      );
    }

    const days = buildWindow(now).map((date): PaceDay => {
      const amount = totals.get(date) ?? 0;

      return { date, amount, isOverPace: isOver(amount, dailyAllowance) };
    });

    return {
      days,
      dayOfMonth: now.getDate(),
      daysInMonth: getDaysInMonth(now),
      peak: Math.max(...days.map((day) => day.amount), 0),
    };
  }, [expenses, dailyAllowance, now]);
};

// --- Helpers ---

const buildWindow = (now: Date): string[] => {
  const dates: string[] = [];
  for (let offset = WINDOW - 1; offset >= 0; offset -= 1) {
    dates.push(toIsoDate(subDays(now, offset)));
  }

  return dates;
};

// No allowance means no pace to be over, so nothing gets marked. Marking every
// bar that had any spending on it would make the accent mean "you bought
// something", which is not a signal.
const isOver = (amount: number, allowance: number | null): boolean => {
  if (allowance === null || allowance <= 0) {
    return false;
  }

  return amount > allowance;
};
