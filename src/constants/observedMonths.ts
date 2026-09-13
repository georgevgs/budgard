type DatedRow = { date: string };

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
