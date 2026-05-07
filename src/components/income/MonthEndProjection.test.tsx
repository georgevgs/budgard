import { describe, it, expect } from 'vitest';
import { projectAmount } from './MonthEndProjection';
import { getMonthlyAmount } from '@/lib/recurring';
import type { RecurringExpense } from '@/types/RecurringExpense';

const makeRecurring = (
  amount: number,
  frequency: RecurringExpense['frequency'],
): RecurringExpense => ({
  id: 'r-1',
  user_id: 'u-1',
  amount,
  description: 'test',
  frequency,
  start_date: '2026-01-01',
  created_at: '2026-01-01T00:00:00Z',
  active: true,
});

describe('getMonthlyAmount', () => {
  it('returns the amount unchanged for monthly', () => {
    expect(getMonthlyAmount(makeRecurring(100, 'monthly'))).toBe(100);
  });

  it('multiplies weekly by 4.33', () => {
    expect(getMonthlyAmount(makeRecurring(50, 'weekly'))).toBeCloseTo(216.5);
  });

  it('multiplies biweekly by 2.17', () => {
    expect(getMonthlyAmount(makeRecurring(100, 'biweekly'))).toBeCloseTo(217);
  });

  it('divides quarterly by 3', () => {
    expect(getMonthlyAmount(makeRecurring(300, 'quarterly'))).toBe(100);
  });

  it('divides yearly by 12', () => {
    expect(getMonthlyAmount(makeRecurring(1200, 'yearly'))).toBe(100);
  });

  it('handles zero amount', () => {
    expect(getMonthlyAmount(makeRecurring(0, 'weekly'))).toBe(0);
  });
});

describe('projectAmount', () => {
  it('returns max(actual, recurring) when progress < 15%', () => {
    // Too early to extrapolate — use recurring floor or actuals, whichever is higher
    expect(projectAmount(50, 0.1, 200)).toBe(200);
    expect(projectAmount(300, 0.1, 200)).toBe(300);
  });

  it('linearly extrapolates actuals past the 15% threshold', () => {
    // 25% through, 250 actual → linear projection 1000
    expect(projectAmount(250, 0.25, 0)).toBe(1000);
  });

  it('uses recurring as a floor when extrapolation is lower', () => {
    // 50% through, 100 actual → linear 200; recurring 500 wins
    expect(projectAmount(100, 0.5, 500)).toBe(500);
  });

  it('uses extrapolation when it exceeds recurring', () => {
    // 50% through, 600 actual → linear 1200; recurring 500 → 1200 wins
    expect(projectAmount(600, 0.5, 500)).toBe(1200);
  });

  it('returns 0 when actual and recurring are both 0', () => {
    expect(projectAmount(0, 0.5, 0)).toBe(0);
  });

  it('handles full month progress', () => {
    expect(projectAmount(1000, 1, 0)).toBe(1000);
  });

  it('treats 15% boundary as eligible for extrapolation', () => {
    // 15% through, 150 actual → linear 1000
    expect(projectAmount(150, 0.15, 0)).toBe(1000);
  });
});
