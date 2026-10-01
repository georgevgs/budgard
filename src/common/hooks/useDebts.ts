import { useMemo } from 'react';
import { useDebtsData } from '@/common/contexts/DataContext';
import { sumAmounts } from '@/constants/money';
import type { Debt } from '@/types/Debt';

export type DebtSummary = {
  totalBalance: number | null;
  totalOriginalPrincipal: number | null;
  totalMinimumPayment: number | null;
  weightedAverageApr: number | null;
  currency: string | null;
  hasMixedCurrencies: boolean;
  balanceByCurrency: Record<string, number>;
  minimumByCurrency: Record<string, number>;
  activeCount: number;
  completedCount: number;
};

export type DebtsByCurrency = Record<string, Debt[]>;

export const useDebts = () => {
  const debts = useDebtsData();

  const active = useMemo(() => debts.filter((d) => !d.is_archived), [debts]);

  const summary = useMemo((): DebtSummary => {
    const live = active.filter((d) => !d.is_completed && d.current_balance > 0);
    const currencies = new Set(live.map((debt) => debt.currency));
    const hasMixedCurrencies = currencies.size > 1;
    let currency: string | null = null;
    if (currencies.size === 1) {
      currency = live[0].currency;
    }
    const balanceByCurrency: Record<string, number> = {};
    const minimumByCurrency: Record<string, number> = {};
    for (const debt of live) {
      balanceByCurrency[debt.currency] = sumAmounts([
        balanceByCurrency[debt.currency] ?? 0,
        Number(debt.current_balance ?? 0),
      ]);
      minimumByCurrency[debt.currency] = sumAmounts([
        minimumByCurrency[debt.currency] ?? 0,
        Number(debt.minimum_payment ?? 0),
      ]);
    }

    let totalBalance: number | null = null;
    let totalMinimumPayment: number | null = null;
    let weightedAverageApr: number | null = null;
    if (!hasMixedCurrencies) {
      totalBalance = sumAmounts(
        live.map((debt) => Number(debt.current_balance ?? 0)),
      );
      totalMinimumPayment = sumAmounts(
        live.map((debt) => Number(debt.minimum_payment ?? 0)),
      );
      weightedAverageApr = 0;
    }

    let totalOriginalPrincipal: number | null = null;
    if (new Set(active.map((debt) => debt.currency)).size <= 1) {
      totalOriginalPrincipal = sumAmounts(
        active.map((debt) => Number(debt.original_principal ?? 0)),
      );
    }

    const weightedAprNumerator = live.reduce(
      (acc, d) => acc + Number(d.current_balance) * Number(d.apr),
      0,
    );
    if (totalBalance !== null && totalBalance > 0) {
      weightedAverageApr = weightedAprNumerator / totalBalance;
    }

    return {
      totalBalance,
      totalOriginalPrincipal,
      totalMinimumPayment,
      weightedAverageApr,
      currency,
      hasMixedCurrencies,
      balanceByCurrency,
      minimumByCurrency,
      activeCount: live.length,
      completedCount: active.filter((d) => d.is_completed).length,
    };
  }, [active]);

  const byCurrency = useMemo((): DebtsByCurrency => {
    const map: DebtsByCurrency = {};
    for (const d of active) {
      if (!map[d.currency]) {
        map[d.currency] = [];
      }
      map[d.currency].push(d);
    }

    return map;
  }, [active]);

  return { debts: active, summary, byCurrency };
};
