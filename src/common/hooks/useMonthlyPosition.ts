import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  useDataConfig,
  useDebtsData,
  useRecurringData,
} from '@/common/contexts/DataContext';
import {
  collectLoanMinimumsDue,
  sumLoanCostsInMonth,
  sumLoanPaymentsInMonth,
} from '@/constants/debtOutflow';
import { sumAmounts } from '@/constants/money';
import {
  useSavingsRhythm,
  type SavingsRhythm,
} from '@/common/hooks/useSavingsRhythm';
import { computeUpcomingRecurringThisMonth } from '@/constants/forecast';
import { buildMonthlyPosition } from '@/constants/monthlyPosition';
import { sumSpending } from '@/constants/spending';
import type { Expense } from '@/types/Expense';

export const useMonthlyPosition = (
  expenses: Expense[],
  now: Date = new Date(),
) => {
  const { monthlyBudget, defaultSavingsPct, defaultCurrency } = useDataConfig();
  const debts = useDebtsData();
  const { recurringExpenses } = useRecurringData();
  const rhythm = useSavingsRhythm(expenses, now);
  const monthKey = format(now, 'yyyy-MM');

  const setAsideOutsideSpending = setAsideOutsideSpendingOf(rhythm);
  const setAside = setAsideOf(rhythm);

  const { position, upcomingBills, loanMinimumsDue, loanCosts } =
    useMemo(() => {
      const monthRows = expenses.filter(
        (expense) => expense.date.slice(0, 7) === monthKey,
      );
      // Money set aside outside spending, an investment transfer written with
      // is_excluded, still counts towards the savings target through `saved`.
      // Leaving it out of the outflow as well let a transfer shrink the savings
      // reserve without the money ever leaving the budget: investing €100 raised
      // safe-to-spend by €100. A savings-category transfer already counts on both
      // sides; this puts every set-aside on that footing, so Spent + Due + Save
      // still add up to what is gone.
      // A loan payment is on the same footing: not spending, but gone from the
      // budget all the same.
      const spent =
        sumSpending(monthRows) +
        setAsideOutsideSpending +
        sumLoanPaymentsInMonth(debts, defaultCurrency, monthKey);
      const upcomingBills = computeUpcomingRecurringThisMonth(
        recurringExpenses,
        now,
        monthRows,
      );
      // A loan minimum not yet paid this month is committed like a bill. Plan's
      // month timeline lists the same entries, so the Due figure and the list it
      // opens still total the same.
      const loanMinimumsDue = collectLoanMinimumsDue(
        debts,
        defaultCurrency,
        now,
      );
      const committed = sumAmounts([
        upcomingBills,
        ...loanMinimumsDue.map((due) => due.amount),
      ]);

      return {
        upcomingBills,
        loanMinimumsDue,
        loanCosts: sumLoanCostsInMonth(debts, defaultCurrency, now, true),
        position: buildMonthlyPosition({
          monthlyBudget,
          spent,
          committed,
          savingsTargetPct: defaultSavingsPct,
          saved: setAside,
        }),
      };
    }, [
      debts,
      defaultCurrency,
      defaultSavingsPct,
      expenses,
      monthKey,
      monthlyBudget,
      now,
      recurringExpenses,
      setAside,
      setAsideOutsideSpending,
    ]);

  return {
    position,
    upcomingBills,
    loanMinimumsDue,
    loanCosts,
    rhythm,
    monthKey,
  };
};

const setAsideOutsideSpendingOf = (rhythm: SavingsRhythm | null): number => {
  if (null === rhythm) {
    return 0;
  }

  return rhythm.setAsideOutsideSpending;
};

const setAsideOf = (rhythm: SavingsRhythm | null): number => {
  if (null === rhythm) {
    return 0;
  }

  return rhythm.setAside;
};
