import { useMemo } from 'react';
import { useExpenseOps } from './dataOps/useExpenseOps';
import { useIncomeOps } from './dataOps/useIncomeOps';
import { useCategoryOps } from './dataOps/useCategoryOps';
import { useTagOps } from './dataOps/useTagOps';
import { useTemplateOps } from './dataOps/useTemplateOps';
import { useGoalOps } from './dataOps/useGoalOps';
import { useAccountOps } from './dataOps/useAccountOps';
import { useDebtOps } from './dataOps/useDebtOps';
import { useRecurringExpenseOps } from './dataOps/useRecurringExpenseOps';
import { useRecurringIncomeOps } from './dataOps/useRecurringIncomeOps';
import { useBudgetOps } from './dataOps/useBudgetOps';
import { useSettingsOps } from './dataOps/useSettingsOps';

export type { ReceiptOptions } from './dataOps/useExpenseOps';

// Aggregates every domain ops hook so existing consumers can keep importing a
// single hook. New consumers should prefer the per-domain hooks under
// `./dataOps/` so they only subscribe to the slice they actually need.
export const useDataOperations = () => {
  const expenseOps = useExpenseOps();
  const incomeOps = useIncomeOps();
  const categoryOps = useCategoryOps();
  const tagOps = useTagOps();
  const templateOps = useTemplateOps();
  const goalOps = useGoalOps();
  const accountOps = useAccountOps();
  const debtOps = useDebtOps();
  const recurringExpenseOps = useRecurringExpenseOps();
  const recurringIncomeOps = useRecurringIncomeOps();
  const budgetOps = useBudgetOps();
  const settingsOps = useSettingsOps();

  return useMemo(
    () => ({
      ...expenseOps,
      ...incomeOps,
      ...categoryOps,
      ...tagOps,
      ...templateOps,
      ...goalOps,
      ...accountOps,
      ...debtOps,
      ...recurringExpenseOps,
      ...recurringIncomeOps,
      ...budgetOps,
      ...settingsOps,
    }),
    [
      expenseOps,
      incomeOps,
      categoryOps,
      tagOps,
      templateOps,
      goalOps,
      accountOps,
      debtOps,
      recurringExpenseOps,
      recurringIncomeOps,
      budgetOps,
      settingsOps,
    ],
  );
};
