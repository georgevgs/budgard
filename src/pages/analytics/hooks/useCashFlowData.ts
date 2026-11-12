import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  useDataConfig,
  useDebtsData,
  useExpensesData,
  useIncomesData,
} from '@/common/contexts/DataContext';
import { collectLoanPayments } from '@/constants/debtOutflow';
import { useDateLocale } from '@/common/hooks/useDateLocale';
import { countsInTotals } from '@/constants/spending';
import { sumAmounts } from '@/constants/money';
import { averageOverCompleteMonths } from '@/constants/observedMonths';
import { useCurrentDate } from '@/common/hooks/useCurrentDate';

export const useCashFlowData = (selectedYear: number) => {
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const debts = useDebtsData();
  const { defaultCurrency } = useDataConfig();
  const dateLocale = useDateLocale();
  const now = useCurrentDate();
  // Cash out, though not spending: a loan payment belongs in the outflow bar
  // or the net overstates what the year left behind.
  const loanPayments = useMemo(
    () =>
      collectLoanPayments(debts, defaultCurrency).filter(
        (payment) => selectedYear === Number(payment.date.slice(0, 4)),
      ),
    [debts, defaultCurrency, selectedYear],
  );

  const monthlyData = useMemo(() => {
    const expByMonth = new Array(12).fill(0);
    const incByMonth = new Array(12).fill(0);

    // YYYY-MM-DD dates: slicing the year/month straight off the string is
    // ~10x faster than parseISO per row (see useExpensesFilter).
    //
    // A transfer between the user's own accounts is a row on both sides. Left
    // in, it inflated the income bar and the expense bar by the same amount —
    // net stayed right by luck while both bars, and avgNet's numerator, were
    // wrong.
    for (const e of expenses) {
      if (!countsInTotals(e)) {
        continue;
      }
      if (Number(e.date.slice(0, 4)) !== selectedYear) {
        continue;
      }
      const month = Number(e.date.slice(5, 7)) - 1;
      expByMonth[month] = sumAmounts([expByMonth[month], e.amount]);
    }

    for (const payment of loanPayments) {
      const month = Number(payment.date.slice(5, 7)) - 1;
      expByMonth[month] = sumAmounts([expByMonth[month], payment.amount]);
    }

    for (const i of incomes) {
      if (!countsInTotals(i)) {
        continue;
      }
      if (Number(i.date.slice(0, 4)) !== selectedYear) {
        continue;
      }
      const month = Number(i.date.slice(5, 7)) - 1;
      incByMonth[month] = sumAmounts([incByMonth[month], i.amount]);
    }

    return Array.from({ length: 12 }, (_, idx) => {
      const monthDate = new Date(selectedYear, idx, 1);
      const incomeTotal = incByMonth[idx];
      const expenseTotal = expByMonth[idx];

      return {
        month: format(monthDate, 'LLL', { locale: dateLocale }),
        fullMonth: format(monthDate, 'LLLL yyyy', { locale: dateLocale }),
        income: incomeTotal,
        expense: -expenseTotal,
        net: sumAmounts([incomeTotal, -expenseTotal]),
      };
    });
  }, [expenses, incomes, loanPayments, selectedYear, dateLocale]);

  const yearTotals = useMemo(() => {
    const totalIncome = sumAmounts(monthlyData.map((m) => m.income));
    const totalExpense = sumAmounts(monthlyData.map((m) => -m.expense));

    const isInYear = (row: (typeof expenses)[number]): boolean =>
      countsInTotals(row) && selectedYear === Number(row.date.slice(0, 4));
    const signedRows = [
      ...incomes
        .filter(isInYear)
        .map((row) => ({ date: row.date, amount: row.amount })),
      ...expenses
        .filter(isInYear)
        .map((row) => ({ date: row.date, amount: -row.amount })),
      ...loanPayments.map((payment) => ({
        date: payment.date,
        amount: -payment.amount,
      })),
    ];
    const avgNet = averageOverCompleteMonths(
      signedRows,
      selectedYear,
      now,
    ).average;

    return {
      totalIncome,
      totalExpense,
      net: sumAmounts([totalIncome, -totalExpense]),
      avgNet,
    };
  }, [expenses, incomes, loanPayments, monthlyData, now, selectedYear]);

  const noData = yearTotals.totalIncome === 0 && yearTotals.totalExpense === 0;

  return { monthlyData, yearTotals, noData };
};
