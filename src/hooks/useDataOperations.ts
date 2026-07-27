import { useMemo } from 'react';
import { useExpenseOps } from '@/hooks/dataOps/useExpenseOps';
import { useIncomeOps } from '@/hooks/dataOps/useIncomeOps';
import { useCategoryOps } from '@/hooks/dataOps/useCategoryOps';
import { useTagOps } from '@/hooks/dataOps/useTagOps';
import { useTemplateOps } from '@/hooks/dataOps/useTemplateOps';
import { useGoalOps } from '@/hooks/dataOps/useGoalOps';
import { useAccountOps } from '@/hooks/dataOps/useAccountOps';
import { useDebtOps } from '@/hooks/dataOps/useDebtOps';
import { useRecurringExpenseOps } from '@/hooks/dataOps/useRecurringExpenseOps';
import { useRecurringIncomeOps } from '@/hooks/dataOps/useRecurringIncomeOps';
import { useBudgetOps } from '@/hooks/dataOps/useBudgetOps';
import { useSettingsOps } from '@/hooks/dataOps/useSettingsOps';

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
