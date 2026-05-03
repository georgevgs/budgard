import { describe, it, expect } from 'vitest';
import { computeAccountYtd } from './ytd';
import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';

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
  created_at: '2025-01-01',
  updated_at: '2026-05-03',
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

const NOW = new Date('2026-05-03T12:00:00Z');

describe('computeAccountYtd', () => {
  it('returns null when there are no snapshots', () => {
    expect(computeAccountYtd(makeAccount(), [], NOW)).toBeNull();
  });

  it('returns null when no snapshot exists before Jan 1', () => {
    const snapshots = [
      makeSnapshot({ recorded_at: '2026-02-01', balance: 1000 }),
    ];
    expect(
      computeAccountYtd(
        makeAccount({ current_balance: 1100 }),
        snapshots,
        NOW,
      ),
    ).toBeNull();
  });

  it('computes pure growth with no contributions', () => {
    const snapshots = [
      makeSnapshot({ recorded_at: '2025-12-31', balance: 1000 }),
      makeSnapshot({ recorded_at: '2026-04-30', balance: 1100 }),
    ];
    const result = computeAccountYtd(
      makeAccount({ current_balance: 1100 }),
      snapshots,
      NOW,
    );
    expect(result).not.toBeNull();
    expect(result!.growth).toBeCloseTo(100, 5);
    expect(result!.pct).toBeCloseTo(10, 5);
  });

  it('strips out YTD contributions so deposits do not inflate return', () => {
    const snapshots = [
      makeSnapshot({ recorded_at: '2025-12-31', balance: 1000 }),
      makeSnapshot({
        recorded_at: '2026-03-01',
        balance: 1500,
        contribution_delta: 400,
      }),
    ];
    // current=1500, baseline=1000, contributions=400 → growth = 100, pct = 10%
    const result = computeAccountYtd(
      makeAccount({ current_balance: 1500 }),
      snapshots,
      NOW,
    );
    expect(result!.growth).toBeCloseTo(100, 5);
    expect(result!.pct).toBeCloseTo(10, 5);
  });

  it('uses the latest snapshot before Jan 1 as the baseline', () => {
    const snapshots = [
      makeSnapshot({ recorded_at: '2024-06-01', balance: 500 }),
      makeSnapshot({ recorded_at: '2025-12-15', balance: 1000 }),
      makeSnapshot({ recorded_at: '2026-04-01', balance: 1100 }),
    ];
    const result = computeAccountYtd(
      makeAccount({ current_balance: 1100 }),
      snapshots,
      NOW,
    );
    // Baseline = the Dec 15 2025 snapshot, not the older one.
    expect(result!.growth).toBeCloseTo(100, 5);
    expect(result!.pct).toBeCloseTo(10, 5);
  });

  it('returns negative growth when value dropped', () => {
    const snapshots = [
      makeSnapshot({ recorded_at: '2025-12-31', balance: 1000 }),
    ];
    const result = computeAccountYtd(
      makeAccount({ current_balance: 900 }),
      snapshots,
      NOW,
    );
    expect(result!.growth).toBeCloseTo(-100, 5);
    expect(result!.pct).toBeCloseTo(-10, 5);
  });

  it('returns null when baseline balance is zero', () => {
    const snapshots = [
      makeSnapshot({ recorded_at: '2025-12-31', balance: 0 }),
    ];
    expect(
      computeAccountYtd(
        makeAccount({ current_balance: 100 }),
        snapshots,
        NOW,
      ),
    ).toBeNull();
  });
});
