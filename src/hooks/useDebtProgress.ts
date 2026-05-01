import { useMemo } from 'react';
import { simulatePayoff, minimumCoversInterest } from '@/lib/debtPayoff';
import type { Debt } from '@/types/Debt';

export type DebtProgress = {
  debtId: string;
  percentPaid: number; // 0..1
  currentBalance: number;
  originalPrincipal: number;
  paidToDate: number;
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
  const paidToDate = Math.max(principal - balance, 0);
  const percentPaid = principal > 0 ? Math.min(paidToDate / principal, 1) : 0;

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
    monthsRemaining: projection.monthsToPayoff,
    projectedPayoffDate: projection.payoffDate,
    projectedTotalInterest: projection.totalInterestPaid,
    isUnpayable: projection.unpayable || !minimumCoversInterest(debt),
  };
};
