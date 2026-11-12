import { describe, expect, it } from 'vitest';
import {
  averageOverCompleteMonths,
  countObservedMonths,
  getObservedMonthRange,
} from '@/constants/observedMonths';

const now = new Date(2026, 7, 15);

describe('observed month boundaries', () => {
  it('starts at the first tracked month and includes quiet months after it', () => {
    const rows = [{ date: '2026-06-04' }, { date: '2026-08-01' }];

    expect(getObservedMonthRange(rows, 2026, now)).toEqual({
      start: 5,
      end: 7,
    });
    expect(countObservedMonths(rows, 2026, now)).toBe(3);
  });

  it('does not turn earlier missing months into zeroes', () => {
    expect(countObservedMonths([{ date: '2026-08-01' }], 2026, now)).toBe(1);
  });

  it('uses year-end for a past observed year', () => {
    expect(countObservedMonths([{ date: '2025-10-01' }], 2025, now)).toBe(3);
  });

  it('has no observed span without rows', () => {
    expect(getObservedMonthRange([], 2026, now)).toBeNull();
  });
});

describe('average over complete months', () => {
  // On 15 August, August is half a month. Counted as a whole one it pulled the
  // average down to 250.
  it('leaves the month in progress out of the average', () => {
    const rows = [
      { date: '2026-06-04', amount: 300 },
      { date: '2026-07-09', amount: 300 },
      { date: '2026-08-01', amount: 150 },
    ];

    expect(averageOverCompleteMonths(rows, 2026, now)).toEqual({
      average: 300,
      months: 2,
    });
  });

  it('uses the month in progress when it is the only one', () => {
    const rows = [{ date: '2026-08-01', amount: 150 }];

    expect(averageOverCompleteMonths(rows, 2026, now)).toEqual({
      average: 150,
      months: 1,
    });
  });

  it('averages a past year over every observed month', () => {
    const rows = [{ date: '2025-10-01', amount: 90 }];

    expect(averageOverCompleteMonths(rows, 2025, now)).toEqual({
      average: 30,
      months: 3,
    });
  });

  it('has no average without rows', () => {
    expect(averageOverCompleteMonths([], 2026, now)).toEqual({
      average: 0,
      months: 0,
    });
  });
});
