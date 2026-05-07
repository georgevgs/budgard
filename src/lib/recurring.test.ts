import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { format } from 'date-fns';
import { calculateNextOccurrence, getMonthlyAmount } from './recurring';
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
      last_generated_date: '2026-04-15',
    });
    expect(localDate(calculateNextOccurrence(r))).toBe('2026-05-15');
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
