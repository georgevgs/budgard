import { describe, it, expect } from 'vitest';
import { xirr, computeAccountXirr, type Cashflow } from './xirr';
import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';

const cf = (date: string, amount: number): Cashflow => ({
  date: new Date(`${date}T00:00:00Z`),
  amount,
});

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'a1',
  user_id: 'u1',
  name: 'Trade Republic',
  kind: 'investment',
  default_currency: 'EUR',
  current_balance: 0,
  cost_basis: 0,
  icon: 'trending-up',
  color: '#f97316',
  is_archived: false,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  ...overrides,
});

const makeSnapshot = (overrides: Partial<AccountBalance>): AccountBalance => ({
  id: crypto.randomUUID(),
  account_id: 'a1',
  user_id: 'u1',
  balance: 0,
  contribution_delta: null,
  recorded_at: '2026-01-01',
  note: null,
  created_at: '2026-01-01',
  ...overrides,
});

describe('xirr', () => {
  it('returns null when fewer than two cashflows', () => {
    expect(xirr([])).toBeNull();
    expect(xirr([cf('2026-01-01', -1000)])).toBeNull();
  });

  it('returns null when all cashflows share the same sign', () => {
    expect(
      xirr([cf('2026-01-01', -1000), cf('2026-06-01', -500)]),
    ).toBeNull();
  });

  it('returns null when first and last cashflows are on the same date', () => {
    expect(
      xirr([cf('2026-01-01', -1000), cf('2026-01-01', 1100)]),
    ).toBeNull();
  });

  it('computes 10% annualized return for a one-year doubling-then-halving toy case', () => {
    // Deposit 1000 on day 0, value = 1100 one year later → exactly 10%.
    const rate = xirr([cf('2026-01-01', -1000), cf('2027-01-01', 1100)]);
    expect(rate).not.toBeNull();
    expect(rate as number).toBeCloseTo(0.1, 4);
  });

  it('computes negative return when value drops', () => {
    const rate = xirr([cf('2026-01-01', -1000), cf('2027-01-01', 900)]);
    expect(rate).not.toBeNull();
    expect(rate as number).toBeCloseTo(-0.1, 4);
  });

  it('handles multiple irregular contributions', () => {
    // €100/month for 12 months → €1200 in, ending value €1300. The
    // money-weighted average holding period is roughly 6 months, so €100
    // gain on €1200 over ~half a year produces a mid-teens annualized rate.
    const flows: Cashflow[] = [];
    for (let i = 0; i < 12; i++) {
      const month = String(i + 1).padStart(2, '0');
      flows.push(cf(`2026-${month}-01`, -100));
    }
    flows.push(cf('2027-01-01', 1300));
    const rate = xirr(flows);
    expect(rate).not.toBeNull();
    expect(rate as number).toBeGreaterThan(0.1);
    expect(rate as number).toBeLessThan(0.25);
  });

  it('handles withdrawals (positive non-terminal cashflows)', () => {
    const rate = xirr([
      cf('2026-01-01', -1000),
      cf('2026-07-01', 200),
      cf('2027-01-01', 900),
    ]);
    expect(rate).not.toBeNull();
    // Net €100 gain on €1000 over a year, but the €200 withdrawal mid-year
    // means the remaining capital had to work harder — slightly above 10%.
    expect(rate as number).toBeGreaterThan(0.1);
    expect(rate as number).toBeLessThan(0.13);
  });
});

describe('computeAccountXirr', () => {
  it('returns null for non-investment accounts', () => {
    const account = makeAccount({ kind: 'bank', current_balance: 1000 });
    expect(computeAccountXirr(account, [])).toBeNull();
  });

  it('returns null when no contributions are logged', () => {
    const account = makeAccount({ current_balance: 1000 });
    const snapshots = [
      makeSnapshot({
        balance: 900,
        recorded_at: '2026-01-01',
        contribution_delta: null,
      }),
      makeSnapshot({
        balance: 1000,
        recorded_at: '2026-06-01',
        contribution_delta: null,
      }),
    ];
    expect(computeAccountXirr(account, snapshots)).toBeNull();
  });

  it('computes XIRR when contributions are logged', () => {
    const account = makeAccount({ current_balance: 1100 });
    const snapshots = [
      makeSnapshot({
        balance: 1000,
        recorded_at: '2026-01-01',
        contribution_delta: 1000,
      }),
      makeSnapshot({
        balance: 1100,
        recorded_at: '2027-01-01',
        contribution_delta: 0,
      }),
    ];
    const rate = computeAccountXirr(account, snapshots);
    expect(rate).not.toBeNull();
    expect(rate as number).toBeCloseTo(0.1, 4);
  });

  it('returns null when current balance is zero', () => {
    const account = makeAccount({ current_balance: 0 });
    const snapshots = [
      makeSnapshot({
        balance: 1000,
        recorded_at: '2026-01-01',
        contribution_delta: 1000,
      }),
    ];
    expect(computeAccountXirr(account, snapshots)).toBeNull();
  });
});
