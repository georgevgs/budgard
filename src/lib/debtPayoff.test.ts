import { describe, it, expect } from 'vitest';
import { sumAmounts } from '@/lib/money';
import {
  simulatePayoff,
  compareStrategies,
  minimumCoversInterest,
} from '@/lib/debtPayoff';
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

  it('recycles freed minimums from paid-off debts into remaining balances', () => {
    // Debt A pays off quickly; its 200/mo minimum should then attack debt B.
    const a = makeDebt({
      id: 'a',
      apr: 0,
      current_balance: 200,
      minimum_payment: 200,
    });
    const b = makeDebt({
      id: 'b',
      apr: 0,
      current_balance: 1000,
      minimum_payment: 100,
    });

    const r = simulatePayoff({
      debts: [a, b],
      monthlyExtra: 0,
      strategy: 'snowball',
    });

    // A clears in month 1 paying 200. From month 2 onward, B receives
    // 100 (own min) + 200 (freed) = 300/month. Starting at 1000, B
    // clears in month 4. Total paid = 200 + 1000 = 1200.
    expect(r.perDebtPayoffMonth.a).toBe(1);
    expect(r.perDebtPayoffMonth.b).toBe(4);
    expect(r.totalPaid).toBe(1200);
  });

  it('cascades a minimum that overshot its balance into the same month', () => {
    // A owes 50 but its minimum is 500. The 450 it could not spend has to
    // reach B in THIS month, not sit idle until A's payoff frees the minimum
    // in the next one.
    const a = makeDebt({
      id: 'a',
      apr: 0,
      current_balance: 50,
      minimum_payment: 500,
    });
    const b = makeDebt({
      id: 'b',
      apr: 0,
      current_balance: 1000,
      minimum_payment: 100,
    });

    const r = simulatePayoff({
      debts: [a, b],
      monthlyExtra: 0,
      strategy: 'snowball',
    });

    const monthOne = r.schedule[0].payments;
    const paidToB = monthOne.find((p) => p.debtId === 'b')?.payment;

    // B gets its own 100 plus A's 450 overflow.
    expect(monthOne.find((p) => p.debtId === 'a')?.payment).toBe(50);
    expect(paidToB).toBe(550);
    expect(r.perDebtPayoffMonth.a).toBe(1);
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

describe('schedule reconciliation', () => {
  const NOW = new Date(2026, 0, 15);

  const debt = (overrides: Partial<Debt>): Debt =>
    ({
      id: 'd1',
      user_id: 'u1',
      name: 'Card',
      kind: 'credit_card',
      original_principal: 1000,
      current_balance: 1000,
      apr: 20,
      minimum_payment: 100,
      currency: 'EUR',
      start_date: '2026-01-01',
      is_archived: false,
      is_completed: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      ...overrides,
    }) as Debt;

  it("the schedule's interest column sums to the reported total", () => {
    const result = simulatePayoff({
      debts: [debt({})],
      monthlyExtra: 0,
      strategy: 'avalanche',
      now: NOW,
    });

    const scheduled = sumAmounts(
      result.schedule.flatMap((entry) =>
        entry.payments.map((payment) => payment.interest),
      ),
    );

    expect(scheduled).toBeCloseTo(result.totalInterestPaid, 2);
  });

  it('reconciles even when the minimum does not cover the interest', () => {
    // The case the old code hid: displayed interest was capped at the payment
    // while the total accrued the full amount, so the two never agreed.
    const result = simulatePayoff({
      debts: [debt({ apr: 30, minimum_payment: 5, current_balance: 5000 })],
      monthlyExtra: 0,
      strategy: 'avalanche',
      now: NOW,
    });

    expect(result.unpayable).toBe(true);

    const scheduled = sumAmounts(
      result.schedule.flatMap((entry) =>
        entry.payments.map((payment) => payment.interest),
      ),
    );

    expect(scheduled).toBeCloseTo(result.totalInterestPaid, 2);
  });

  it('shows negative amortization rather than clamping principal at zero', () => {
    const result = simulatePayoff({
      debts: [debt({ apr: 30, minimum_payment: 5, current_balance: 5000 })],
      monthlyExtra: 0,
      strategy: 'avalanche',
      now: NOW,
    });

    expect(result.schedule[0].payments[0].principal).toBeLessThan(0);
  });

  it('total paid equals principal repaid plus interest accrued', () => {
    const result = simulatePayoff({
      debts: [debt({})],
      monthlyExtra: 50,
      strategy: 'avalanche',
      now: NOW,
    });

    // Everything that left the wallet covered the original balance and the
    // interest that accrued on it — the closing entry of the ledger.
    expect(result.totalPaid).toBeCloseTo(1000 + result.totalInterestPaid, 2);
  });

  it('does not overflow the payoff date past a short month', () => {
    // setMonth overflowed 31 Jan + 1 month to 3 March.
    const result = simulatePayoff({
      debts: [debt({ current_balance: 100, minimum_payment: 100, apr: 0 })],
      monthlyExtra: 0,
      strategy: 'avalanche',
      now: new Date(2026, 0, 31),
    });

    expect(result.payoffDate).toBe('2026-02-28');
  });
});
