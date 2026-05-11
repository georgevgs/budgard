import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDebts } from './useDebts';
import type { Debt } from '@/types/Debt';

let dataMock: { debts: Debt[] } = { debts: [] };

vi.mock('@/contexts/DataContext', () => ({
  useDebtsData: () => dataMock.debts,
}));

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

describe('useDebts', () => {
  beforeEach(() => {
    dataMock = { debts: [] };
  });

  it('returns zero summary when no debts exist', () => {
    const { result } = renderHook(() => useDebts());

    expect(result.current.summary.totalBalance).toBe(0);
    expect(result.current.summary.activeCount).toBe(0);
    expect(result.current.summary.weightedAverageApr).toBe(0);
  });

  it('sums balances and minimums across active debts', () => {
    dataMock.debts = [
      makeDebt({ id: 'a', current_balance: 1000, minimum_payment: 50 }),
      makeDebt({ id: 'b', current_balance: 4000, minimum_payment: 100 }),
    ];

    const { result } = renderHook(() => useDebts());

    expect(result.current.summary.totalBalance).toBe(5000);
    expect(result.current.summary.totalMinimumPayment).toBe(150);
    expect(result.current.summary.activeCount).toBe(2);
  });

  it('weights average APR by current balance', () => {
    dataMock.debts = [
      makeDebt({ id: 'a', current_balance: 1000, apr: 5 }),
      makeDebt({ id: 'b', current_balance: 4000, apr: 25 }),
    ];

    const { result } = renderHook(() => useDebts());

    // weighted: (1000*5 + 4000*25) / 5000 = 21
    expect(result.current.summary.weightedAverageApr).toBeCloseTo(21, 5);
  });

  it('excludes archived debts from list and summary', () => {
    dataMock.debts = [
      makeDebt({ id: 'a', current_balance: 1000 }),
      makeDebt({ id: 'b', current_balance: 9999, is_archived: true }),
    ];

    const { result } = renderHook(() => useDebts());

    expect(result.current.debts).toHaveLength(1);
    expect(result.current.summary.totalBalance).toBe(1000);
  });

  it('keeps completed debts in the list but excludes them from active totals', () => {
    dataMock.debts = [
      makeDebt({ id: 'a', current_balance: 1000 }),
      makeDebt({
        id: 'b',
        current_balance: 0,
        is_completed: true,
      }),
    ];

    const { result } = renderHook(() => useDebts());

    expect(result.current.debts).toHaveLength(2);
    expect(result.current.summary.activeCount).toBe(1);
    expect(result.current.summary.completedCount).toBe(1);
    expect(result.current.summary.totalBalance).toBe(1000);
  });

  it('groups debts by currency', () => {
    dataMock.debts = [
      makeDebt({ id: 'a', currency: 'EUR' }),
      makeDebt({ id: 'b', currency: 'USD' }),
      makeDebt({ id: 'c', currency: 'EUR' }),
    ];

    const { result } = renderHook(() => useDebts());

    expect(result.current.byCurrency.EUR).toHaveLength(2);
    expect(result.current.byCurrency.USD).toHaveLength(1);
  });
});
