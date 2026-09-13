import { describe, expect, it } from 'vitest';
import {
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
