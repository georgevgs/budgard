import { format } from 'date-fns';
import { sumAmounts } from '@/constants/money';

type DatedRow = { date: string };
type DatedAmount = { date: string; amount: number };

// A monthly average over the months that have finished. The month in progress
// is a part-month, counting it as a whole one pulled every average down, by
// half on the 3rd of February. It only stands in when it is all there is.
export const averageOverCompleteMonths = (
  rows: DatedAmount[],
  year: number,
  now: Date,
): { average: number; months: number } => {
  const observed = countObservedMonths(rows, year, now);
  const currentMonthKey = format(now, 'yyyy-MM');
  const hasCompleteMonths = year === now.getFullYear() && 1 < observed;

  if (0 === observed) {
    return { average: 0, months: 0 };
  } else if (hasCompleteMonths) {
    const complete = rows.filter(
      (row) => currentMonthKey !== row.date.slice(0, 7),
    );

    return {
      average: sumAmounts(complete.map((row) => row.amount)) / (observed - 1),
      months: observed - 1,
    };
  } else {
    return {
      average: sumAmounts(rows.map((row) => row.amount)) / observed,
      months: observed,
    };
  }
};

export const countObservedMonths = (
  rows: DatedRow[],
  year: number,
  now: Date,
): number => {
  const range = getObservedMonthRange(rows, year, now);
  if (range === null) {
    return 0;
  }

  return range.end - range.start + 1;
};

// Months before the first stored row are unknown, not zero. Once tracking has
// started, quiet months through today (or year-end for a past year) are real.
export const getObservedMonthRange = (
  rows: DatedRow[],
  year: number,
  now: Date,
): { start: number; end: number } | null => {
  if (rows.length === 0 || year > now.getFullYear()) {
    return null;
  }

  const start = Math.min(
    ...rows.map((row) => Number(row.date.slice(5, 7)) - 1),
  );
  let end = 11;
  if (year === now.getFullYear()) {
    end = now.getMonth();
  }

  return { start, end: Math.max(start, end) };
};
