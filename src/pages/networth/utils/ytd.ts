import { differenceInCalendarDays } from 'date-fns';
import { parseIsoDate } from '@/constants/dates';
import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';

// Year-to-date growth, stripping out contributions made this year so deposits
// do not masquerade as performance. The percentage is money-weighted (Modified
// Dietz): each contribution counts for the share of the year it was invested. Returns null when there's no baseline
// snapshot before Jan 1 (account too young to have a meaningful YTD).
export type YtdResult = {
  growth: number;
  pct: number;
};

export const computeAccountYtd = (
  account: Account,
  snapshots: AccountBalance[],
  now: Date = new Date(),
): YtdResult | null => {
  if (snapshots.length === 0) {
    return null;
  }

  const yearStartStr = `${now.getFullYear()}-01-01`;

  // Snapshots arrive newest-first from useAccountBalances, but we don't want
  // to assume — find the most recent snapshot strictly before Jan 1.
  let baseline: AccountBalance | null = null;
  for (const s of snapshots) {
    if (s.recorded_at >= yearStartStr) {
      continue;
    }
    if (!baseline || s.recorded_at > baseline.recorded_at) {
      baseline = s;
    }
  }

  if (!baseline) {
    return null;
  }
  if (baseline.balance <= 0) {
    return null;
  }

  const yearStart = parseIsoDate(yearStartStr);
  const periodDays = Math.max(differenceInCalendarDays(now, yearStart), 1);
  const flows = snapshots
    .filter((snapshot) => snapshot.recorded_at >= yearStartStr)
    .map((snapshot) => ({
      amount: snapshot.contribution_delta ?? 0,
      // The share of the period the money was invested for.
      weight:
        (periodDays -
          differenceInCalendarDays(
            parseIsoDate(snapshot.recorded_at.slice(0, 10)),
            yearStart,
          )) /
        periodDays,
    }));
  const ytdContributions = flows.reduce((sum, flow) => sum + flow.amount, 0);
  // Modified Dietz. Growth over the baseline alone credited this year's
  // deposits with nothing in the denominator, so a small account that received
  // a large deposit showed a return many times its real one.
  const averageCapital =
    baseline.balance +
    flows.reduce((sum, flow) => sum + flow.amount * flow.weight, 0);
  const growth = account.current_balance - baseline.balance - ytdContributions;

  if (0 < averageCapital) {
    return { growth, pct: (growth / averageCapital) * 100 };
  } else {
    return null;
  }
};
