import { describe, expect, it } from 'vitest';
import {
  describeAmount,
  prepareStoredTransactionAmount,
  resolveSourceAmount,
  resolveSourceCurrency,
} from '@/lib/transactionAmount';
import type { Expense } from '@/types/Expense';

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

  it('keeps a default-currency amount as stored', async () => {
    const amount = await prepareStoredTransactionAmount(12.5, {
      defaultCurrency: 'EUR',
      selectedCurrency: 'EUR',
      ensureRate: async () => 2,
    });

    expect(amount).toEqual({
      amount: 12.5,
      original_amount: null,
      original_currency: null,
      exchange_rate: null,
    });
  });

  it('converts and preserves a foreign-currency amount', async () => {
    const amount = await prepareStoredTransactionAmount(10, {
      defaultCurrency: 'EUR',
      selectedCurrency: 'USD',
      ensureRate: async () => 0.85,
    });

    expect(amount).toEqual({
      amount: 8.5,
      original_amount: 10,
      original_currency: 'USD',
      exchange_rate: 0.85,
    });
  });

  it('restores the original amount and currency when editing', () => {
    const transaction = {
      amount: 8.5,
      original_amount: 10,
      original_currency: 'USD',
    } as Expense;

    expect(resolveSourceCurrency(transaction, 'EUR')).toBe('USD');
    expect(resolveSourceAmount(transaction, 'EUR')).toBe(10);
  });
});
