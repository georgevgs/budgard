import { describe, it, expect, afterEach, vi } from 'vitest';
import { format } from 'date-fns';
import {
  addMonthsAnchored,
  anchorDayOf,
  currentMonthKey,
  parseIsoDate,
  startOfToday,
  toIsoDate,
  todayIso,
} from '@/lib/dates';

afterEach(() => {
  vi.useRealTimers();
});

describe('todayIso', () => {
  it('uses the local day, not the UTC day', () => {
    // 00:30 local on the 1st. toISOString() would give the previous day in any
    // positive-offset zone, booking the row into a month already closed.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 1, 0, 30, 0));

    expect(todayIso()).toBe('2026-08-01');
  });

  it('does not roll forward late in the evening', () => {
    // 23:30 local. In a negative-offset zone toISOString() would give the
    // next day.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 31, 23, 30, 0));

    expect(todayIso()).toBe('2026-07-31');
  });

  it('agrees with the date-fns formatting used by the forms', () => {
    const now = new Date(2026, 7, 22, 2, 15, 0);
    expect(toIsoDate(now)).toBe(format(now, 'yyyy-MM-dd'));
  });
});

describe('parseIsoDate', () => {
  it('parses as local midnight', () => {
    const parsed = parseIsoDate('2026-08-01');

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(7);
    expect(parsed.getDate()).toBe(1);
    expect(parsed.getHours()).toBe(0);
  });

  it('round-trips through toIsoDate', () => {
    for (const value of ['2026-01-01', '2026-02-28', '2026-12-31']) {
      expect(toIsoDate(parseIsoDate(value))).toBe(value);
    }
  });
});

describe('currentMonthKey', () => {
  it('uses the local month', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 1, 0, 30, 0));

    expect(currentMonthKey()).toBe('2026-08');
  });
});

describe('startOfToday', () => {
  it('zeroes the time', () => {
    const start = startOfToday(new Date(2026, 7, 22, 13, 45, 30, 500));

    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
  });
});

describe('addMonthsAnchored', () => {
  const iso = (d: Date) => toIsoDate(d);

  it('clamps into a short month without losing the anchor', () => {
    expect(iso(addMonthsAnchored(new Date(2026, 0, 31), 1, 31))).toBe(
      '2026-02-28',
    );
  });

  it('recovers the anchor the following month', () => {
    // The drift bug: taking the next step from the clamped date left the
    // schedule on the 28th forever.
    expect(iso(addMonthsAnchored(new Date(2026, 1, 28), 1, 31))).toBe(
      '2026-03-31',
    );
  });

  it('walks a full year without drifting', () => {
    let cursor = new Date(2026, 0, 31);
    const days: number[] = [];
    for (let index = 0; index < 12; index += 1) {
      cursor = addMonthsAnchored(cursor, 1, 31);
      days.push(cursor.getDate());
    }

    expect(days).toEqual([28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31]);
  });

  it('handles a leap-day anchor across four years', () => {
    expect(iso(addMonthsAnchored(new Date(2024, 1, 29), 12, 29))).toBe(
      '2025-02-28',
    );
    expect(iso(addMonthsAnchored(new Date(2027, 1, 28), 12, 29))).toBe(
      '2028-02-29',
    );
  });

  it('crosses the year boundary', () => {
    expect(iso(addMonthsAnchored(new Date(2026, 11, 15), 1, 15))).toBe(
      '2027-01-15',
    );
  });

  it('returns local midnight', () => {
    expect(
      addMonthsAnchored(new Date(2026, 0, 15, 23, 59), 1, 15).getHours(),
    ).toBe(0);
  });
});

describe('anchorDayOf', () => {
  it('reads the day-of-month from an ISO date', () => {
    expect(anchorDayOf('2026-01-31')).toBe(31);
    expect(anchorDayOf('2026-02-01')).toBe(1);
  });
});
