import { describe, it, expect } from 'vitest';
import {
  canAddRecurringExpense,
  getFreeAnalyticsCutoff,
  FREE_RECURRING_EXPENSE_LIMIT,
} from '@/lib/proLimits';

describe('canAddRecurringExpense', () => {
  it('always allows Pro users', () => {
    expect(canAddRecurringExpense(true, 0)).toBe(true);
    expect(canAddRecurringExpense(true, 50)).toBe(true);
  });

  it('allows free users below the cap', () => {
    expect(canAddRecurringExpense(false, 0)).toBe(true);
    expect(
      canAddRecurringExpense(false, FREE_RECURRING_EXPENSE_LIMIT - 1),
    ).toBe(true);
  });

  it('blocks free users at the cap', () => {
    expect(canAddRecurringExpense(false, FREE_RECURRING_EXPENSE_LIMIT)).toBe(
      false,
    );
    expect(
      canAddRecurringExpense(false, FREE_RECURRING_EXPENSE_LIMIT + 2),
    ).toBe(false);
  });
});

describe('getFreeAnalyticsCutoff', () => {
  it('returns the first day of the month two months back', () => {
    const cutoff = getFreeAnalyticsCutoff(new Date('2026-07-20T12:00:00'));
    expect(cutoff.getFullYear()).toBe(2026);
    expect(cutoff.getMonth()).toBe(4);
    expect(cutoff.getDate()).toBe(1);
  });

  it('crosses the year boundary correctly', () => {
    const cutoff = getFreeAnalyticsCutoff(new Date('2026-01-15T12:00:00'));
    expect(cutoff.getFullYear()).toBe(2025);
    expect(cutoff.getMonth()).toBe(10);
    expect(cutoff.getDate()).toBe(1);
  });
});
