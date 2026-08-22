import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { format } from 'date-fns';
import { calculateNextOccurrence, getMonthlyAmount } from '@/lib/recurring';
import type { RecurringExpense } from '@/types/RecurringExpense';

// Use local-time formatting because addMonths/addWeeks operate on local
// components — comparing via toISOString() gives DST-dependent off-by-one
// results in non-UTC zones.
const localDate = (d: Date | null | undefined) =>
  d ? format(d, 'yyyy-MM-dd') : null;

const buildRecurring = (
  overrides: Partial<RecurringExpense>,
): RecurringExpense => ({
  id: 'r1',
  user_id: 'u1',
  amount: 10,
  description: 'Netflix',
  frequency: 'monthly',
  start_date: '2026-01-01',
  active: true,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('calculateNextOccurrence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-07T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when expense is inactive', () => {
    const r = buildRecurring({ active: false });
    expect(calculateNextOccurrence(r)).toBeNull();
  });

  it('returns null when end_date is in the past', () => {
    const r = buildRecurring({ end_date: '2026-01-01' });
    expect(calculateNextOccurrence(r)).toBeNull();
  });

  it('returns the start date when start_date is today or future', () => {
    const r = buildRecurring({ start_date: '2026-06-01' });
    expect(localDate(calculateNextOccurrence(r))).toBe('2026-06-01');
  });

  it('advances from last_generated_date by one period', () => {
    const r = buildRecurring({
      frequency: 'monthly',
      // Consistent with the anchor: a schedule that starts on the 15th is the
      // only one that can have generated on the 15th.
      start_date: '2026-01-15',
      last_generated_date: '2026-04-15',
    });
    expect(localDate(calculateNextOccurrence(r))).toBe('2026-05-15');
  });

  it('keeps a month-end schedule on its anchor day instead of drifting', () => {
    // The drift bug: Jan 31 clamped to Feb 28, and every later occurrence was
    // taken from the clamped date, so the bill stayed on the 28th forever.
    const anchored = (lastGenerated: string) =>
      localDate(
        calculateNextOccurrence(
          buildRecurring({
            frequency: 'monthly',
            start_date: '2026-01-31',
            last_generated_date: lastGenerated,
          }),
        ),
      );

    expect(anchored('2026-01-31')).toBe('2026-02-28');
    expect(anchored('2026-02-28')).toBe('2026-03-31');
    expect(anchored('2026-03-31')).toBe('2026-04-30');
    expect(anchored('2026-04-30')).toBe('2026-05-31');
  });

  it('keeps a leap-day yearly schedule anchored', () => {
    const anchored = (lastGenerated: string) =>
      localDate(
        calculateNextOccurrence(
          buildRecurring({
            frequency: 'yearly',
            start_date: '2024-02-29',
            last_generated_date: lastGenerated,
          }),
        ),
      );

    expect(anchored('2024-02-29')).toBe('2025-02-28');
    expect(anchored('2027-02-28')).toBe('2028-02-29');
  });

  it('still returns the final occurrence on the end date itself', () => {
    // end_date parsed as UTC midnight used to compare as "already past" for
    // most of the day in a positive-offset timezone.
    const r = buildRecurring({
      frequency: 'monthly',
      start_date: '2026-01-07',
      last_generated_date: '2026-04-07',
      end_date: '2026-05-07',
    });
    expect(localDate(calculateNextOccurrence(r))).toBe('2026-05-07');
  });

  it('returns a schedule starting today rather than skipping to next period', () => {
    const r = buildRecurring({ frequency: 'monthly', start_date: '2026-05-07' });
    expect(localDate(calculateNextOccurrence(r))).toBe('2026-05-07');
  });

  it('catches up from an old start_date when last_generated_date is missing', () => {
    const r = buildRecurring({
      frequency: 'monthly',
      start_date: '2026-01-15',
      last_generated_date: undefined,
    });
    // Today is 2026-05-07; the next occurrence ≥ today is 2026-05-15.
    expect(localDate(calculateNextOccurrence(r))).toBe('2026-05-15');
  });

  it('bails out when catch-up would loop forever (start_date in distant past)', () => {
    const r = buildRecurring({
      frequency: 'weekly',
      start_date: '1900-01-01',
      last_generated_date: undefined,
    });
    // 126 years × 52 weeks ≈ 6552 iterations — past the 1000 cap, bail to null.
    expect(calculateNextOccurrence(r)).toBeNull();
  });

  it('handles weekly cadence', () => {
    const r = buildRecurring({
      frequency: 'weekly',
      last_generated_date: '2026-05-01',
    });
    expect(localDate(calculateNextOccurrence(r))).toBe('2026-05-08');
  });

  it('handles yearly cadence', () => {
    const r = buildRecurring({
      frequency: 'yearly',
      last_generated_date: '2025-05-01',
    });
    expect(localDate(calculateNextOccurrence(r))).toBe('2026-05-01');
  });
});

describe('getMonthlyAmount', () => {
  it('returns the raw amount for monthly cadence', () => {
    expect(getMonthlyAmount(buildRecurring({ amount: 25 }))).toBe(25);
  });

  it('multiplies weekly by ~4.33', () => {
    expect(
      getMonthlyAmount(buildRecurring({ amount: 10, frequency: 'weekly' })),
    ).toBeCloseTo(43.3);
  });

  it('multiplies biweekly by ~2.17', () => {
    expect(
      getMonthlyAmount(buildRecurring({ amount: 10, frequency: 'biweekly' })),
    ).toBeCloseTo(21.7);
  });

  it('divides quarterly by 3', () => {
    expect(
      getMonthlyAmount(buildRecurring({ amount: 30, frequency: 'quarterly' })),
    ).toBe(10);
  });

  it('divides yearly by 12', () => {
    expect(
      getMonthlyAmount(buildRecurring({ amount: 120, frequency: 'yearly' })),
    ).toBe(10);
  });
});

describe('occurrence calendar parity with the database', () => {
  // The DB generates the rows (process_all_recurring_expenses) and the client
  // previews them (Today, Plan, forecast). If the two calendars disagree, the
  // app shows a bill on a day it will not be charged. These dates were taken
  // from calculate_next_occurrence running in Postgres against the same
  // schedule, so a change to either side that breaks the agreement fails here.
  const walk = (
    frequency: RecurringExpense['frequency'],
    startDate: string,
    steps: number,
  ): string[] => {
    const dates: string[] = [];
    let lastGenerated = startDate;

    for (let index = 0; index < steps; index += 1) {
      const next = calculateNextOccurrence(
        buildRecurring({
          frequency,
          start_date: startDate,
          last_generated_date: lastGenerated,
          // Far enough ahead that nothing is filtered as past.
          end_date: '2030-12-31',
        }),
        new Date(2026, 0, 1),
      );
      if (!next) break;
      lastGenerated = localDate(next) as string;
      dates.push(lastGenerated);
    }

    return dates;
  };

  it('matches the server for a monthly schedule anchored on the 31st', () => {
    expect(walk('monthly', '2026-01-31', 11)).toEqual([
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
      '2026-06-30',
      '2026-07-31',
      '2026-08-31',
      '2026-09-30',
      '2026-10-31',
      '2026-11-30',
      '2026-12-31',
    ]);
  });

  it('matches the server for a quarterly schedule anchored on the 31st', () => {
    expect(walk('quarterly', '2026-01-31', 4)).toEqual([
      '2026-04-30',
      '2026-07-31',
      '2026-10-31',
      '2027-01-31',
    ]);
  });

  it('matches the server for a leap-day yearly schedule', () => {
    expect(walk('yearly', '2024-02-29', 5)).toEqual([
      '2025-02-28',
      '2026-02-28',
      '2027-02-28',
      '2028-02-29',
      '2029-02-28',
    ]);
  });

  it('matches the server for weekly and biweekly cadences', () => {
    expect(walk('weekly', '2026-01-31', 3)).toEqual([
      '2026-02-07',
      '2026-02-14',
      '2026-02-21',
    ]);
    expect(walk('biweekly', '2026-01-31', 2)).toEqual([
      '2026-02-14',
      '2026-02-28',
    ]);
  });
});
