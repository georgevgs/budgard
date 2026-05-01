import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useDebtPayoffPlan,
  useDebtSimulation,
} from './useDebtPayoffPlan';
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

describe('useDebtPayoffPlan', () => {
  it('returns both strategies', () => {
    const { result } = renderHook(() => useDebtPayoffPlan([makeDebt()], 0));

    expect(result.current.snowball).toBeDefined();
    expect(result.current.avalanche).toBeDefined();
    expect(result.current.avalanche.monthsToPayoff).toBeGreaterThan(0);
  });

  it('filters out archived, completed, and zero-balance debts', () => {
    const debts = [
      makeDebt({ id: 'live', current_balance: 1000, minimum_payment: 100, apr: 0 }),
      makeDebt({ id: 'archived', is_archived: true }),
      makeDebt({ id: 'completed', is_completed: true }),
      makeDebt({ id: 'zero', current_balance: 0 }),
    ];

    const { result } = renderHook(() => useDebtPayoffPlan(debts, 0));

    // Only the live debt contributes — 1000 / 100 = 10 months at 0% APR
    expect(result.current.avalanche.monthsToPayoff).toBe(10);
  });

  it('returns empty result when all debts are filtered out', () => {
    const debts = [makeDebt({ is_archived: true })];

    const { result } = renderHook(() => useDebtPayoffPlan(debts, 0));

    expect(result.current.avalanche.monthsToPayoff).toBe(0);
    expect(result.current.snowball.monthsToPayoff).toBe(0);
  });
});

describe('useDebtSimulation', () => {
  it('routes the strategy through to simulatePayoff', () => {
    // Same balance, different APR: avalanche pumps extra into the high-APR
    // debt, snowball into either (sort is stable). The avalanche result must
    // pay the high-APR debt off strictly earlier than snowball does.
    const debts = [
      makeDebt({ id: 'low', apr: 5, current_balance: 2000, minimum_payment: 50 }),
      makeDebt({ id: 'high', apr: 25, current_balance: 2000, minimum_payment: 50 }),
    ];

    const { result: snowballResult } = renderHook(() =>
      useDebtSimulation(debts, 200, 'snowball'),
    );
    const { result: avalancheResult } = renderHook(() =>
      useDebtSimulation(debts, 200, 'avalanche'),
    );

    expect(
      avalancheResult.current.perDebtPayoffMonth.high,
    ).toBeLessThan(snowballResult.current.perDebtPayoffMonth.high);
    expect(avalancheResult.current.totalInterestPaid).toBeLessThanOrEqual(
      snowballResult.current.totalInterestPaid,
    );
  });
});
