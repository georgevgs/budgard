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
    const spent = sumSpending(
      expenses.filter((expense) => expense.date.slice(0, 7) === monthKey),
    );
    const committed = computeUpcomingRecurringThisMonth(recurringExpenses, now);

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
  ]);

  return { position, rhythm, monthKey };
};
