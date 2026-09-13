import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  useAccountsData,
  useExpensesData,
  useIncomesData,
  useRecurringData,
} from '@/common/contexts/DataContext';
import { useDateLocale } from '@/common/hooks/useDateLocale';
import {
  computeSpendableBalance,
  computeTwelveMonthProjection,
  findFirstShortfall,
} from '@/constants/forecast';
import { useCurrentDate } from '@/common/hooks/useCurrentDate';
import { useMonthlyPosition } from '@/common/hooks/useMonthlyPosition';

// Wires DataContext slices into the pure forecast math (lib/forecast.ts).
// ForecastSection only renders for Pro users, so the full expense history is
// used directly — no free-window filtering here.
export const useForecastData = () => {
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const { recurringExpenses, recurringIncomes } = useRecurringData();
  const { accounts } = useAccountsData();
  const dateLocale = useDateLocale();
  const now = useCurrentDate();
  const monthly = useMonthlyPosition(expenses, now);

  return useMemo(() => {
    // What the spendable accounts hold now. Null when the user tracks none,
    // in which case the projection reports flows without a balance line.
    const openingBalance = computeSpendableBalance(accounts);

    const projection = computeTwelveMonthProjection({
      expenses,
      incomes,
      recurringExpenses,
      recurringIncomes,
      now,
      openingBalance,
      formatMonthLabel: (monthStart) =>
        format(monthStart, 'LLL yy', { locale: dateLocale }),
    });

    const noData =
      expenses.length === 0 &&
      incomes.length === 0 &&
      recurringExpenses.length === 0 &&
      recurringIncomes.length === 0;

    return {
      safeToSpend: monthly.position.available,
      projection,
      noData,
      openingBalance,
      shortfall: findFirstShortfall(projection),
    };
  }, [
    expenses,
    incomes,
    recurringExpenses,
    recurringIncomes,
    monthly.position.available,
    accounts,
    dateLocale,
    now,
  ]);
};
