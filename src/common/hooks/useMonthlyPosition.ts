import { useMemo } from 'react';
import { format } from 'date-fns';
import { useDataConfig, useRecurringData } from '@/common/contexts/DataContext';
import { useSavingsRhythm } from '@/common/hooks/useSavingsRhythm';
import { computeUpcomingRecurringThisMonth } from '@/constants/forecast';
import { buildMonthlyPosition } from '@/constants/monthlyPosition';
import { sumSpending } from '@/constants/spending';
import type { Expense } from '@/types/Expense';

export const useMonthlyPosition = (
  expenses: Expense[],
  now: Date = new Date(),
) => {
  const { monthlyBudget, defaultSavingsPct } = useDataConfig();
  const { recurringExpenses } = useRecurringData();
  const rhythm = useSavingsRhythm(expenses, now);
  const monthKey = format(now, 'yyyy-MM');

  const position = useMemo(() => {
    const monthRows = expenses.filter(
      (expense) => expense.date.slice(0, 7) === monthKey,
    );
    // Money set aside outside spending — an investment transfer, written with
    // is_excluded — still counts towards the savings target through `saved`.
    // Leaving it out of the outflow as well let a transfer shrink the savings
    // reserve without the money ever leaving the budget: investing €100 raised
    // safe-to-spend by €100. A savings-category transfer already counts on both
    // sides; this puts every set-aside on that footing, so Spent + Due + Save
    // still add up to what is gone.
    const spent =
      sumSpending(monthRows) + (rhythm?.setAsideOutsideSpending ?? 0);
    const committed = computeUpcomingRecurringThisMonth(
      recurringExpenses,
      now,
      monthRows,
    );

    return buildMonthlyPosition({
      monthlyBudget,
      spent,
      committed,
      savingsTargetPct: defaultSavingsPct,
      saved: rhythm?.setAside ?? 0,
    });
  }, [
    defaultSavingsPct,
    expenses,
    monthKey,
    monthlyBudget,
    now,
    recurringExpenses,
    rhythm?.setAside,
    rhythm?.setAsideOutsideSpending,
  ]);

  return { position, rhythm, monthKey };
};
