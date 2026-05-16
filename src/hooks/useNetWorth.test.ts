import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNetWorth } from './useNetWorth';
import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';
import type { Debt } from '@/types/Debt';

let dataMock: {
  accounts: Account[];
  accountBalances: AccountBalance[];
  debts: Debt[];
  defaultCurrency: string;
} = {
  accounts: [],
  accountBalances: [],
  debts: [],
  defaultCurrency: 'EUR',
};

vi.mock('@/contexts/DataContext', () => ({
  useAccountsData: () => ({
    accounts: dataMock.accounts,
    accountBalances: dataMock.accountBalances,
  }),
  useDebtsData: () => dataMock.debts,
  useDataConfig: () => ({ defaultCurrency: dataMock.defaultCurrency }),
}));

vi.mock('@/services/exchangeRateService', () => ({
  // USD→EUR fixed at 0.9 for tests so multi-currency math is predictable.
  fetchExchangeRate: vi.fn(async (from: string, _date: string, _signal: AbortSignal | undefined, to: string) => {
    if (from === to) return 1;
    if (from === 'USD' && to === 'EUR') return 0.9;
    return 1;
  }),
}));

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'a-' + Math.random().toString(36).slice(2, 10),
  user_id: 'u1',
  name: 'Account',
  kind: 'bank',
  default_currency: 'EUR',
  current_balance: 0,
  cost_basis: 0,
  icon: 'wallet',
  color: '#f97316',
  is_archived: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeDebt = (overrides: Partial<Debt> = {}): Debt => ({
  id: 'd-' + Math.random().toString(36).slice(2, 10),
  user_id: 'u1',
  name: 'Debt',
  kind: 'credit_card',
  original_principal: 0,
  current_balance: 0,
  apr: 0,
  minimum_payment: 0,
  currency: 'EUR',
  start_date: '2026-01-01',
  payoff_target_date: null,
  icon: 'credit-card',
  color: '#ef4444',
  is_archived: false,
  is_completed: false,
  completed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeBalance = (
  accountId: string,
  recordedAt: string,
  balance: number,
  overrides: Partial<AccountBalance> = {},
): AccountBalance => ({
  id: 'b-' + Math.random().toString(36).slice(2, 10),
  account_id: accountId,
  user_id: 'u1',
  balance,
  contribution_delta: null,
  recorded_at: recordedAt,
  note: null,
  created_at: recordedAt + 'T10:00:00Z',
  ...overrides,
});

describe('useNetWorth', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-05-01'));
    dataMock = {
      accounts: [],
      accountBalances: [],
      debts: [],
      defaultCurrency: 'EUR',
    };
  });

  it('returns zero summary when no accounts', () => {
    const { result } = renderHook(() => useNetWorth());

    expect(result.current.summary.total).toBe(0);
    expect(result.current.summary.assets).toBe(0);
    expect(result.current.summary.liabilities).toBe(0);
    expect(result.current.series).toEqual([]);
  });

  it('subtracts liabilities from assets in same currency', () => {
    dataMock = {
      defaultCurrency: 'EUR',
      accounts: [
        makeAccount({ id: 'cash', kind: 'cash', current_balance: 1000 }),
        makeAccount({
          id: 'card',
          kind: 'credit_card',
          current_balance: 200,
        }),
      ],
      accountBalances: [],
      debts: [],
    };

    const { result } = renderHook(() => useNetWorth());

    expect(result.current.summary.assets).toBe(1000);
    expect(result.current.summary.liabilities).toBe(200);
    expect(result.current.summary.total).toBe(800);
  });

  it('computes investment gain from current_balance vs cost_basis', () => {
    dataMock = {
      defaultCurrency: 'EUR',
      accounts: [
        makeAccount({
          id: 'inv',
          kind: 'investment',
          current_balance: 1500,
          cost_basis: 1000,
        }),
      ],
      accountBalances: [],
      debts: [],
    };

    const { result } = renderHook(() => useNetWorth());

    expect(result.current.summary.investmentValue).toBe(1500);
    expect(result.current.summary.investmentCostBasis).toBe(1000);
    expect(result.current.summary.investmentGain).toBe(500);
  });

  it('converts foreign-currency balances to default using fetched rate', async () => {
    dataMock = {
      defaultCurrency: 'EUR',
      accounts: [
        makeAccount({
          id: 'usd-bank',
          kind: 'bank',
          default_currency: 'USD',
          current_balance: 1000,
        }),
      ],
      accountBalances: [],
      debts: [],
    };

    const { result } = renderHook(() => useNetWorth());

    await waitFor(() => {
      expect(result.current.summary.assets).toBe(900);
    });
    expect(result.current.summary.total).toBe(900);
  });

  it('builds a forward-filled time series across snapshots', () => {
    dataMock = {
      defaultCurrency: 'EUR',
      accounts: [
        makeAccount({ id: 'a1', kind: 'cash', current_balance: 600 }),
        makeAccount({ id: 'a2', kind: 'bank', current_balance: 1200 }),
      ],
      accountBalances: [
        makeBalance('a1', '2026-01-01', 500),
        makeBalance('a2', '2026-02-01', 1000),
        makeBalance('a1', '2026-03-01', 600),
        makeBalance('a2', '2026-04-01', 1200),
      ],
      debts: [],
    };

    const { result } = renderHook(() => useNetWorth());
    const series = result.current.series;

    expect(series).toHaveLength(4);

    // Jan 1 — only a1 has a snapshot
    expect(series[0]).toEqual({
      date: '2026-01-01',
      total: 500,
      assets: 500,
      liabilities: 0,
    });

    // Feb 1 — a1 still 500 (forward-filled), a2 = 1000
    expect(series[1].total).toBe(1500);

    // Mar 1 — a1 → 600, a2 still 1000 (forward-filled)
    expect(series[2].total).toBe(1600);

    // Apr 1 — a1 still 600, a2 → 1200
    expect(series[3].total).toBe(1800);
  });

  it('adds active debts to liabilities and reduces total', () => {
    dataMock = {
      defaultCurrency: 'EUR',
      accounts: [makeAccount({ id: 'cash', kind: 'cash', current_balance: 1000 })],
      accountBalances: [],
      debts: [
        makeDebt({ id: 'card-debt', current_balance: 300 }),
        makeDebt({ id: 'loan-debt', kind: 'auto_loan', current_balance: 200 }),
      ],
    };

    const { result } = renderHook(() => useNetWorth());

    expect(result.current.summary.assets).toBe(1000);
    expect(result.current.summary.liabilities).toBe(500);
    expect(result.current.summary.debts).toBe(500);
    expect(result.current.summary.total).toBe(500);
  });

  it('ignores archived, completed, and zero-balance debts', () => {
    dataMock = {
      defaultCurrency: 'EUR',
      accounts: [makeAccount({ id: 'cash', kind: 'cash', current_balance: 1000 })],
      accountBalances: [],
      debts: [
        makeDebt({ id: 'd1', current_balance: 300 }),
        makeDebt({ id: 'd2', current_balance: 500, is_archived: true }),
        makeDebt({ id: 'd3', current_balance: 800, is_completed: true }),
        makeDebt({ id: 'd4', current_balance: 0 }),
      ],
    };

    const { result } = renderHook(() => useNetWorth());

    expect(result.current.summary.debts).toBe(300);
    expect(result.current.summary.liabilities).toBe(300);
    expect(result.current.summary.total).toBe(700);
  });

  it('converts foreign-currency debt balances to default currency', async () => {
    dataMock = {
      defaultCurrency: 'EUR',
      accounts: [makeAccount({ id: 'cash', kind: 'cash', current_balance: 1000 })],
      accountBalances: [],
      debts: [makeDebt({ id: 'usd-debt', currency: 'USD', current_balance: 1000 })],
    };

    const { result } = renderHook(() => useNetWorth());

    await waitFor(() => {
      expect(result.current.summary.debts).toBe(900);
    });
    expect(result.current.summary.liabilities).toBe(900);
    expect(result.current.summary.total).toBe(100);
  });

  it('applies debt total as a constant baseline across the time series', () => {
    dataMock = {
      defaultCurrency: 'EUR',
      accounts: [makeAccount({ id: 'a1', kind: 'bank', current_balance: 1000 })],
      accountBalances: [
        makeBalance('a1', '2026-01-01', 800),
        makeBalance('a1', '2026-02-01', 1000),
      ],
      debts: [makeDebt({ id: 'd1', current_balance: 200 })],
    };

    const { result } = renderHook(() => useNetWorth());
    const series = result.current.series;

    expect(series).toHaveLength(2);
    expect(series[0]).toEqual({
      date: '2026-01-01',
      assets: 800,
      liabilities: 200,
      total: 600,
    });
    expect(series[1]).toEqual({
      date: '2026-02-01',
      assets: 1000,
      liabilities: 200,
      total: 800,
    });
  });

  it('treats liabilities as negative in the time series', () => {
    dataMock = {
      defaultCurrency: 'EUR',
      accounts: [
        makeAccount({ id: 'a1', kind: 'bank', current_balance: 1000 }),
        makeAccount({
          id: 'card',
          kind: 'credit_card',
          current_balance: 300,
        }),
      ],
      accountBalances: [
        makeBalance('a1', '2026-01-01', 1000),
        makeBalance('card', '2026-01-01', 300),
      ],
      debts: [],
    };

    const { result } = renderHook(() => useNetWorth());

    expect(result.current.series[0]).toEqual({
      date: '2026-01-01',
      assets: 1000,
      liabilities: 300,
      total: 700,
    });
  });
});
