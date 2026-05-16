import { useMemo } from 'react';
import { simulatePayoff, minimumCoversInterest } from '@/lib/debtPayoff';
import type { Debt } from '@/types/Debt';

export type DebtProgress = {
  debtId: string;
  // Range is (-∞, 1]. Negative when current balance exceeds original principal
  // (interest accrued faster than payments, or new draws). Consumers must
  // handle the negative branch — never assume [0, 1].
  percentPaid: number;
  currentBalance: number;
  originalPrincipal: number;
  paidToDate: number;
  // True when current balance > original principal. paidToDate is 0 in this
  // case; balanceOverOriginal carries the overage so the UI can show it.
  balanceIncreased: boolean;
  balanceOverOriginal: number;
  monthsRemaining: number;
  projectedPayoffDate: string;
  projectedTotalInterest: number;
  isUnpayable: boolean;
}

// Per-debt projection. Runs the payoff simulation against just this debt
// (no monthlyExtra, snowball strategy is irrelevant for a single debt).
export const useDebtProgress = (debt: Debt): DebtProgress => {
  return useMemo(() => computeProgress(debt), [debt]);
};

export const useAllDebtProgress = (
  debts: Debt[],
): Record<string, DebtProgress> => {
  return useMemo(() => {
    const map: Record<string, DebtProgress> = {};
    for (const debt of debts) {
      map[debt.id] = computeProgress(debt);
    }

    return map;
  }, [debts]);
};

// --- Helpers ---

const computeProgress = (debt: Debt): DebtProgress => {
  const principal = Number(debt.original_principal ?? 0);
  const balance = Number(debt.current_balance ?? 0);
  const delta = principal - balance;
  const paidToDate = Math.max(delta, 0);
  const balanceIncreased = delta < 0;
  let balanceOverOriginal = 0;
  if (balanceIncreased) {
    balanceOverOriginal = -delta;
  }
  let percentPaid = 0;
  if (principal > 0) {
    percentPaid = Math.min(delta / principal, 1);
  }

  const projection = simulatePayoff({
    debts: [debt],
    monthlyExtra: 0,
    strategy: 'avalanche',
  });

  return {
    debtId: debt.id,
    percentPaid,
    currentBalance: balance,
    originalPrincipal: principal,
    paidToDate,
    balanceIncreased,
    balanceOverOriginal,
    monthsRemaining: projection.monthsToPayoff,
    projectedPayoffDate: projection.payoffDate,
    projectedTotalInterest: projection.totalInterestPaid,
    isUnpayable: projection.unpayable || !minimumCoversInterest(debt),
  };
};
