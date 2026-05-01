import { useMemo } from 'react';
import { compareStrategies, simulatePayoff } from '@/lib/debtPayoff';
import type { Debt, PayoffStrategy } from '@/types/Debt';

// Memoized strategy comparison for the payoff-plan UI. Inputs are the active
// debt list plus the user's monthly extra payment ("how much can you put toward
// debt above minimums?"). Returns both strategies side-by-side.
export const useDebtPayoffPlan = (debts: Debt[], monthlyExtra: number) => {
  return useMemo(() => {
    const active = debts.filter(
      (d) => !d.is_archived && !d.is_completed && d.current_balance > 0,
    );

    return compareStrategies(active, monthlyExtra);
  }, [debts, monthlyExtra]);
};

export const useDebtSimulation = (
  debts: Debt[],
  monthlyExtra: number,
  strategy: PayoffStrategy,
) => {
  return useMemo(() => {
    const active = debts.filter(
      (d) => !d.is_archived && !d.is_completed && d.current_balance > 0,
    );

    return simulatePayoff({ debts: active, monthlyExtra, strategy });
  }, [debts, monthlyExtra, strategy]);
};
