import { describe, it, expect } from 'vitest';
import {
  simulatePayoff,
  compareStrategies,
  minimumCoversInterest,
} from './debtPayoff';
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
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  ...overrides,
});

describe('simulatePayoff', () => {
  it('returns empty result when no active debts', () => {
    const r = simulatePayoff({
      debts: [],
      monthlyExtra: 0,
      strategy: 'avalanche',
    });
    expect(r.monthsToPayoff).toBe(0);
    expect(r.totalInterestPaid).toBe(0);
    expect(r.unpayable).toBe(false);
  });

  it('skips archived and completed debts', () => {
    const r = simulatePayoff({
      debts: [
        makeDebt({ id: 'a', is_archived: true }),
        makeDebt({ id: 'b', is_completed: true }),
        makeDebt({ id: 'c', current_balance: 0 }),
      ],
      monthlyExtra: 0,
      strategy: 'avalanche',
    });
    expect(r.monthsToPayoff).toBe(0);
  });

  it('pays off a single debt with positive interest', () => {
    const r = simulatePayoff({
      debts: [makeDebt()],
      monthlyExtra: 0,
      strategy: 'avalanche',
    });
    expect(r.unpayable).toBe(false);
    expect(r.monthsToPayoff).toBeGreaterThan(0);
    expect(r.totalInterestPaid).toBeGreaterThan(0);
    expect(r.totalPaid).toBeGreaterThan(5000);
  });

  it('pays off zero-interest debt in ceil(balance/minimum) months', () => {
    const r = simulatePayoff({
      debts: [
        makeDebt({ apr: 0, current_balance: 1000, minimum_payment: 100 }),
      ],
      monthlyExtra: 0,
      strategy: 'avalanche',
    });
    expect(r.monthsToPayoff).toBe(10);
    expect(r.totalInterestPaid).toBe(0);
    expect(r.totalPaid).toBe(1000);
  });

  it('flags unpayable when minimum < monthly interest and no extra', () => {
    const r = simulatePayoff({
      debts: [
        makeDebt({ apr: 30, current_balance: 10000, minimum_payment: 50 }),
      ],
      monthlyExtra: 0,
      strategy: 'avalanche',
    });
    expect(r.unpayable).toBe(true);
  });

  it('avalanche pays highest-APR debt off first when extra applies', () => {
    const lowApr = makeDebt({
      id: 'low',
      apr: 5,
      current_balance: 2000,
      minimum_payment: 50,
    });
    const highApr = makeDebt({
      id: 'high',
      apr: 25,
      current_balance: 2000,
      minimum_payment: 50,
    });
    const r = simulatePayoff({
      debts: [lowApr, highApr],
      monthlyExtra: 200,
      strategy: 'avalanche',
    });

    expect(r.perDebtPayoffMonth.high).toBeLessThan(r.perDebtPayoffMonth.low);
  });

  it('snowball pays smallest-balance debt off first when extra applies', () => {
    const big = makeDebt({
      id: 'big',
      apr: 25,
      current_balance: 5000,
      minimum_payment: 100,
    });
    const small = makeDebt({
      id: 'small',
      apr: 5,
      current_balance: 1000,
      minimum_payment: 50,
    });
    const r = simulatePayoff({
      debts: [big, small],
      monthlyExtra: 200,
      strategy: 'snowball',
    });

    expect(r.perDebtPayoffMonth.small).toBeLessThan(r.perDebtPayoffMonth.big);
  });

  it('avalanche pays less total interest than snowball when APRs differ', () => {
    const debts = [
      makeDebt({ id: 'a', apr: 25, current_balance: 3000, minimum_payment: 80 }),
      makeDebt({ id: 'b', apr: 5, current_balance: 1000, minimum_payment: 30 }),
    ];
    const { snowball, avalanche } = compareStrategies(debts, 100);

    expect(avalanche.totalInterestPaid).toBeLessThanOrEqual(
      snowball.totalInterestPaid,
    );
  });

  it('produces a sensible months count for $5000 @ 18% APR / $150 min', () => {
    // Online calculators put this around 47 months. Allow a small range.
    const r = simulatePayoff({
      debts: [makeDebt()],
      monthlyExtra: 0,
      strategy: 'avalanche',
    });
    expect(r.monthsToPayoff).toBeGreaterThanOrEqual(40);
    expect(r.monthsToPayoff).toBeLessThanOrEqual(55);
  });
});

describe('minimumCoversInterest', () => {
  it('returns true when minimum exceeds monthly interest', () => {
    expect(
      minimumCoversInterest(
        makeDebt({ apr: 12, current_balance: 1000, minimum_payment: 50 }),
      ),
    ).toBe(true);
  });

  it('returns false when minimum is below monthly interest', () => {
    expect(
      minimumCoversInterest(
        makeDebt({ apr: 30, current_balance: 10000, minimum_payment: 50 }),
      ),
    ).toBe(false);
  });

  it('returns true when balance is zero', () => {
    expect(
      minimumCoversInterest(
        makeDebt({ apr: 99, current_balance: 0, minimum_payment: 0 }),
      ),
    ).toBe(true);
  });
});
