import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDebtProgress, useAllDebtProgress } from './useDebtProgress';
import type { Debt } from '@/types/Debt';

const makeDebt = (overrides: Partial<Debt> = {}): Debt => ({
  id: overrides.id ?? crypto.randomUUID(),
  user_id: 'u1',
  name: 'Card',
  kind: 'credit_card',
  original_principal: 5000,
  current_balance: 5000,
  apr: 18,
  minimum_payment: 150,
  currency: 'EUR',
  start_date: '2026-01-01',
  payoff_target_date: null,
  icon: 'credit-card',
  color: '#f97316',
  is_archived: false,
  is_completed: false,
  completed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('useDebtProgress', () => {
  it('reports 0% paid when current_balance equals original_principal', () => {
    const { result } = renderHook(() => useDebtProgress(makeDebt()));

    expect(result.current.percentPaid).toBe(0);
    expect(result.current.paidToDate).toBe(0);
  });

  it('reports paidToDate as principal minus current balance', () => {
    const { result } = renderHook(() =>
      useDebtProgress(
        makeDebt({ original_principal: 5000, current_balance: 2000 }),
      ),
    );

    expect(result.current.paidToDate).toBe(3000);
    expect(result.current.percentPaid).toBeCloseTo(0.6, 5);
  });

  it('caps percentPaid at 1 when balance went below 0 due to overpayment', () => {
    const { result } = renderHook(() =>
      useDebtProgress(
        makeDebt({ original_principal: 1000, current_balance: -100 }),
      ),
    );

    expect(result.current.percentPaid).toBe(1);
  });

  it('returns 0% when original_principal is missing', () => {
    const { result } = renderHook(() =>
      useDebtProgress(makeDebt({ original_principal: 0 })),
    );

    expect(result.current.percentPaid).toBe(0);
  });

  it('flags isUnpayable when minimum < monthly interest', () => {
    const { result } = renderHook(() =>
      useDebtProgress(
        makeDebt({ apr: 30, current_balance: 10000, minimum_payment: 50 }),
      ),
    );

    expect(result.current.isUnpayable).toBe(true);
  });

  it('does not flag isUnpayable when minimum covers interest', () => {
    const { result } = renderHook(() =>
      useDebtProgress(
        makeDebt({ apr: 18, current_balance: 5000, minimum_payment: 150 }),
      ),
    );

    expect(result.current.isUnpayable).toBe(false);
    expect(result.current.monthsRemaining).toBeGreaterThan(0);
  });

  it('returns zero monthsRemaining for a cleared debt', () => {
    const { result } = renderHook(() =>
      useDebtProgress(
        makeDebt({ current_balance: 0, is_completed: true }),
      ),
    );

    expect(result.current.monthsRemaining).toBe(0);
    expect(result.current.projectedTotalInterest).toBe(0);
  });
});

describe('useAllDebtProgress', () => {
  it('returns a record keyed by debt id', () => {
    const debts = [
      makeDebt({ id: 'a', current_balance: 1000, original_principal: 2000 }),
      makeDebt({ id: 'b', current_balance: 500, original_principal: 500 }),
    ];

    const { result } = renderHook(() => useAllDebtProgress(debts));

    expect(Object.keys(result.current)).toHaveLength(2);
    expect(result.current.a.percentPaid).toBeCloseTo(0.5, 5);
    expect(result.current.b.percentPaid).toBe(0);
  });
});
