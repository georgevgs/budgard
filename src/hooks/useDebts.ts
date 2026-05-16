import { useMemo } from 'react';
import { useDebtsData } from '@/contexts/DataContext';
import type { Debt } from '@/types/Debt';

export type DebtSummary = {
  totalBalance: number;
  totalOriginalPrincipal: number;
  totalMinimumPayment: number;
  weightedAverageApr: number;
  activeCount: number;
  completedCount: number;
}

export type DebtsByCurrency = Record<string, Debt[]>;

export const useDebts = () => {
  const debts = useDebtsData();

  const active = useMemo(
    () => debts.filter((d) => !d.is_archived),
    [debts],
  );

  const summary = useMemo((): DebtSummary => {
    const live = active.filter((d) => !d.is_completed && d.current_balance > 0);
    const totalBalance = live.reduce(
      (acc, d) => acc + Number(d.current_balance ?? 0),
      0,
    );
    const totalOriginalPrincipal = active.reduce(
      (acc, d) => acc + Number(d.original_principal ?? 0),
      0,
    );
    const totalMinimumPayment = live.reduce(
      (acc, d) => acc + Number(d.minimum_payment ?? 0),
      0,
    );

    const weightedAprNumerator = live.reduce(
      (acc, d) => acc + Number(d.current_balance) * Number(d.apr),
      0,
    );
    let weightedAverageApr = 0;
    if (totalBalance > 0) {
      weightedAverageApr = weightedAprNumerator / totalBalance;
    }

    return {
      totalBalance,
      totalOriginalPrincipal,
      totalMinimumPayment,
      weightedAverageApr,
      activeCount: live.length,
      completedCount: active.filter((d) => d.is_completed).length,
    };
  }, [active]);

  const byCurrency = useMemo((): DebtsByCurrency => {
    const map: DebtsByCurrency = {};
    for (const d of active) {
      if (!map[d.currency]) map[d.currency] = [];
      map[d.currency].push(d);
    }

    return map;
  }, [active]);

  return { debts: active, summary, byCurrency };
};
