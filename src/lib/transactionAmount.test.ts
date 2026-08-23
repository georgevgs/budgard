import { describe, expect, it } from 'vitest';
import { describeAmount } from '@/lib/transactionAmount';

describe('describeAmount', () => {
  it('writes an expense as money out', () => {
    const shown = describeAmount(24.5, 'expense', 'EUR');

    expect(shown.text).toBe('−24,50€');
    expect(shown.tone).toBe('text-foreground');
  });

  it('writes income as money in', () => {
    const shown = describeAmount(2400, 'income', 'EUR');

    expect(shown.text).toBe('+2.400,00€');
    expect(shown.tone).toBe('text-income-ink');
  });

  // A refund is stored as a negative expense. It is money coming back, so it
  // reads like income — and crucially never as a doubled minus, nor as a
  // positive-looking spend after someone reaches for Math.abs.
  it('writes a refund as money in, not as a doubled minus', () => {
    const shown = describeAmount(-24.5, 'expense', 'EUR');

    expect(shown.text).toBe('+24,50€');
    expect(shown.tone).toBe('text-income-ink');
  });

  it('never emits two signs', () => {
    for (const amount of [-10, 0, 10]) {
      for (const kind of ['expense', 'income'] as const) {
        expect(describeAmount(amount, kind, 'EUR').text).not.toMatch(/^.[-−]/);
      }
    }
  });
});
