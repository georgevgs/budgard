import { useMemo } from 'react';
import type { DataState } from '@/common/hooks/data/dataReducer';
import type {
  DataConfig,
  CategoriesSlice,
  RecurringSlice,
  AccountsSlice,
} from '@/common/contexts/DataContext.types';

export const useDataSlices = (data: DataState) => {
  const {
    categories,
    recurringExpenses,
    recurringIncomes,
    accounts,
    accountBalances,
    isInitialized,
    isSecondaryLoaded,
    isHistoryLoaded,
    monthlyBudget,
    defaultCurrency,
    defaultSavingsPct,
    dailyReminderHour,
    notificationPreferences,
  } = data;
  const config = useMemo<DataConfig>(
    () => ({
      isInitialized,
      isSecondaryLoaded,
      isHistoryLoaded,
      monthlyBudget,
      defaultCurrency,
      defaultSavingsPct,
      dailyReminderHour,
      notificationPreferences,
    }),
    [
      isInitialized,
      isSecondaryLoaded,
      isHistoryLoaded,
      monthlyBudget,
      defaultCurrency,
      defaultSavingsPct,
      dailyReminderHour,
      notificationPreferences,
    ],
  );
  const categoriesSlice = useMemo<CategoriesSlice>(
    () => ({
      categories,
      // Categories predating the type column belong to expenses.
      expenseCategories: categories.filter(
        (category) => category.type !== 'income',
      ),
      incomeCategories: categories.filter(
        (category) => category.type === 'income',
      ),
    }),
    [categories],
  );
  const recurringSlice = useMemo<RecurringSlice>(
    () => ({ recurringExpenses, recurringIncomes }),
    [recurringExpenses, recurringIncomes],
  );
  const accountsSlice = useMemo<AccountsSlice>(
    () => ({ accounts, accountBalances }),
    [accounts, accountBalances],
  );

  return { config, categoriesSlice, recurringSlice, accountsSlice };
};
