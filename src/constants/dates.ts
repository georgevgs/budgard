import { format, getDaysInMonth } from 'date-fns';

/**
 * Calendar dates, always in the user's own timezone.
 *
 * A transaction's `date` is a calendar day — "the 1st of August" — not an
 * instant. The two ways of producing one from a `Date` disagree:
 *
 *   new Date().toISOString().slice(0, 10)   the UTC day
 *   format(new Date(), 'yyyy-MM-dd')        the local day
 *
 * They differ for part of every day, in opposite directions either side of
 * UTC. In Athens (UTC+3 in summer) anything logged between midnight and 03:00
 * took the previous day; on the 1st of a month that books it into a period the
 * user has already closed, past the budget bar and the alerts. Every date
 * stamp and every date parse in the app goes through this module so the
 * question is settled in one place.
 */

/** Today as `yyyy-MM-dd`, in the user's timezone. */
export const todayIso = (now: Date = new Date()): string => {
  return toIsoDate(now);
};

/** A `Date` as `yyyy-MM-dd`, in the user's timezone. */
export const toIsoDate = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/** The current month as `yyyy-MM`, in the user's timezone. */
export const currentMonthKey = (now: Date = new Date()): string => {
  return format(now, 'yyyy-MM');
};

/**
 * Parses `yyyy-MM-dd` as local midnight.
 *
 * `new Date('2026-08-01')` is UTC midnight, which renders as 31 July for
 * anyone west of UTC. Appending a time makes the string local, which is what a
 * calendar date means.
 */
export const parseIsoDate = (value: string): Date => {
  return new Date(`${value}T00:00:00`);
};

/** Local midnight today — the comparison point for "is this in the past". */
export const startOfToday = (now: Date = new Date()): Date => {
  const start = new Date(now.getTime());
  start.setHours(0, 0, 0, 0);

  return start;
};

/**
 * Adds whole months while keeping a fixed day-of-month anchor.
 *
 * Plain month addition clamps — 31 January plus a month is 28 February — and
 * if the next step is taken from the clamped date the schedule never returns
 * to the 31st. Anchoring on the original day makes the clamp a one-month
 * adjustment instead of a permanent shift: 31 Jan → 28 Feb → 31 Mar.
 */
export const addMonthsAnchored = (
  from: Date,
  months: number,
  anchorDay: number,
): Date => {
  const monthStart = new Date(
    from.getFullYear(),
    from.getMonth() + months,
    1,
    0,
    0,
    0,
    0,
  );
  const lastDay = getDaysInMonth(monthStart);

  return new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    Math.min(anchorDay, lastDay),
  );
};

/** The day-of-month a schedule is anchored to, from its `yyyy-MM-dd` start. */
export const anchorDayOf = (isoDate: string): number => {
  return parseIsoDate(isoDate).getDate();
};
