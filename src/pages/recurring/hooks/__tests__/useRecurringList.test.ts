import { describe, it, expect } from 'vitest';
import {
  isRecurringDataReady,
  resolveInitialMode,
} from '@/pages/recurring/hooks/useRecurringList';

describe('resolveInitialMode', () => {
  it('opens in income mode when ?mode=income is present', () => {
    expect(resolveInitialMode(new URLSearchParams('mode=income'))).toBe(
      'income',
    );
  });

  it('defaults to expense mode otherwise', () => {
    expect(resolveInitialMode(new URLSearchParams())).toBe('expense');
    expect(resolveInitialMode(new URLSearchParams('mode=expense'))).toBe(
      'expense',
    );
    expect(resolveInitialMode(new URLSearchParams('mode=bogus'))).toBe(
      'expense',
    );
  });
});

describe('isRecurringDataReady', () => {
  it('waits for recurring incomes and accounts before showing either mode', () => {
    expect(isRecurringDataReady(true, false)).toBe(false);
    expect(isRecurringDataReady(true, true)).toBe(true);
  });
});
