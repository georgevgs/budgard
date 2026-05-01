import { describe, it, expect } from 'vitest';
import { debtSchema, debtPaymentSchema } from './validations';

const baseValidDebt = {
  name: 'Visa Gold',
  kind: 'credit_card' as const,
  current_balance: '5.000,00',
  apr: '18.99',
  minimum_payment: '150,00',
  currency: 'EUR',
  icon: 'credit-card',
  color: '#f97316',
};

describe('debtSchema', () => {
  it('accepts a valid debt', () => {
    const result = debtSchema.safeParse(baseValidDebt);
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = debtSchema.safeParse({ ...baseValidDebt, name: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects names over 80 characters', () => {
    const result = debtSchema.safeParse({
      ...baseValidDebt,
      name: 'x'.repeat(81),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown kind', () => {
    const result = debtSchema.safeParse({
      ...baseValidDebt,
      kind: 'lottery_loss',
    });
    expect(result.success).toBe(false);
  });

  it('rejects current_balance of 0', () => {
    const result = debtSchema.safeParse({
      ...baseValidDebt,
      current_balance: '0',
    });
    expect(result.success).toBe(false);
  });

  it('rejects current_balance above the cap', () => {
    const result = debtSchema.safeParse({
      ...baseValidDebt,
      current_balance: '200.000.000',
    });
    expect(result.success).toBe(false);
  });

  it('accepts apr at the boundaries', () => {
    expect(
      debtSchema.safeParse({ ...baseValidDebt, apr: '0' }).success,
    ).toBe(true);
    expect(
      debtSchema.safeParse({ ...baseValidDebt, apr: '100' }).success,
    ).toBe(true);
  });

  it('rejects apr above 100', () => {
    const result = debtSchema.safeParse({ ...baseValidDebt, apr: '101' });
    expect(result.success).toBe(false);
  });

  it('rejects negative apr', () => {
    const result = debtSchema.safeParse({ ...baseValidDebt, apr: '-1' });
    expect(result.success).toBe(false);
  });

  it('rejects non-numeric apr', () => {
    const result = debtSchema.safeParse({ ...baseValidDebt, apr: 'abc' });
    expect(result.success).toBe(false);
  });

  it('accepts apr written with comma decimal', () => {
    const result = debtSchema.safeParse({ ...baseValidDebt, apr: '18,99' });
    expect(result.success).toBe(true);
  });

  it('accepts a zero minimum_payment', () => {
    const result = debtSchema.safeParse({
      ...baseValidDebt,
      minimum_payment: '0',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid hex color', () => {
    const result = debtSchema.safeParse({ ...baseValidDebt, color: 'orange' });
    expect(result.success).toBe(false);
  });

  it('rejects a 2-letter currency code', () => {
    const result = debtSchema.safeParse({ ...baseValidDebt, currency: 'EU' });
    expect(result.success).toBe(false);
  });
});

describe('debtPaymentSchema', () => {
  const baseValid = {
    amount: '150,00',
    date: new Date('2026-05-01'),
    description: 'May payment',
  };

  it('accepts a valid payment', () => {
    expect(debtPaymentSchema.safeParse(baseValid).success).toBe(true);
  });

  it('accepts an empty description (optional)', () => {
    expect(
      debtPaymentSchema.safeParse({ ...baseValid, description: undefined })
        .success,
    ).toBe(true);
  });

  it('rejects amount of 0', () => {
    expect(
      debtPaymentSchema.safeParse({ ...baseValid, amount: '0' }).success,
    ).toBe(false);
  });

  it('rejects missing date', () => {
    const { date: _omit, ...rest } = baseValid;
    expect(debtPaymentSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects descriptions over 200 characters', () => {
    expect(
      debtPaymentSchema.safeParse({
        ...baseValid,
        description: 'x'.repeat(201),
      }).success,
    ).toBe(false);
  });
});
