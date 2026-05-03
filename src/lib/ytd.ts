import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';

// Year-to-date growth, stripping out contributions made this year so deposits
// don't masquerade as performance. Returns null when there's no baseline
// snapshot before Jan 1 (account too young to have a meaningful YTD).
export type YtdResult = {
  growth: number;
  pct: number;
}

export const computeAccountYtd = (
  account: Account,
  snapshots: AccountBalance[],
  now: Date = new Date(),
): YtdResult | null => {
  if (snapshots.length === 0) return null;

  const yearStartStr = `${now.getFullYear()}-01-01`;

  // Snapshots arrive newest-first from useAccountBalances, but we don't want
  // to assume — find the most recent snapshot strictly before Jan 1.
  let baseline: AccountBalance | null = null;
  for (const s of snapshots) {
    if (s.recorded_at >= yearStartStr) continue;
    if (!baseline || s.recorded_at > baseline.recorded_at) {
      baseline = s;
    }
  }

  if (!baseline) return null;
  if (baseline.balance <= 0) return null;

  const ytdContributions = snapshots
    .filter((s) => s.recorded_at >= yearStartStr)
    .reduce((sum, s) => sum + (s.contribution_delta ?? 0), 0);

  const growth = account.current_balance - baseline.balance - ytdContributions;
  const pct = (growth / baseline.balance) * 100;

  return { growth, pct };
};
