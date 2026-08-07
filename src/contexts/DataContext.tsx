import { createContext, useContext } from 'react';
import type { Expense } from '@/types/Expense';
import type { Tag } from '@/types/Tag';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';
import type { Goal } from '@/types/Goal';
import type { Debt } from '@/types/Debt';
import type { CategoryBudget } from '@/types/CategoryBudget';
import type { NoSpendDay } from '@/types/NoSpendDay';
import type {
  DataActions,
  DataConfig,
  CategoriesSlice,
  RecurringSlice,
  AccountsSlice,
} from '@/contexts/DataContext.types';

// Context objects live here, apart from the provider (DataProvider.tsx), so
// this module exports no components and consumer hooks keep fast refresh.

export const DataActionsContext = createContext<DataActions | null>(null);
export const DataConfigContext = createContext<DataConfig | null>(null);

// Per-slice contexts. Granular subscriptions: a component reading
// ExpensesDataContext only re-renders when expenses change, not when incomes
// or tags do.
export const ExpensesDataContext = createContext<Expense[] | null>(null);
export const IncomesDataContext = createContext<Expense[] | null>(null);
export const CategoriesDataContext = createContext<CategoriesSlice | null>(
  null,
);
export const TagsDataContext = createContext<Tag[] | null>(null);
export const TemplatesDataContext = createContext<ExpenseTemplate[] | null>(
  null,
);
export const RecurringDataContext = createContext<RecurringSlice | null>(null);
export const GoalsDataContext = createContext<Goal[] | null>(null);
export const AccountsDataContext = createContext<AccountsSlice | null>(null);
export const DebtsDataContext = createContext<Debt[] | null>(null);
export const CategoryBudgetsDataContext = createContext<
  CategoryBudget[] | null
>(null);
export const NoSpendDaysDataContext = createContext<NoSpendDay[] | null>(null);

// Use this when a component only needs setters/refresh callbacks. Skips
// re-renders triggered by data mutations.
export const useDataActions = () => {
  const context = useContext(DataActionsContext);

  if (!context) {
    throw new Error('useDataActions must be used within a DataProvider');
  }

  return context;
};

// Use this for slow-changing scalars (init flag, monthly budget, default
// currency, default savings pct). Skips re-renders triggered by data mutations.
export const useDataConfig = () => {
  const context = useContext(DataConfigContext);

  if (!context) {
    throw new Error('useDataConfig must be used within a DataProvider');
  }

  return context;
};

// ─── Per-slice hooks ────────────────────────────────────────────────────────
// Each subscribes to a single domain context, so consumers only re-render
// when that slice changes — e.g. a tag mutation doesn't re-render expense
// list consumers, an expense add doesn't re-render goals consumers.

export const useExpensesData = () => {
  const ctx = useContext(ExpensesDataContext);
  if (ctx === null) {
    throw new Error('useExpensesData must be used within a DataProvider');
  }

  return ctx;
};

export const useIncomesData = () => {
  const ctx = useContext(IncomesDataContext);
  if (ctx === null) {
    throw new Error('useIncomesData must be used within a DataProvider');
  }

  return ctx;
};

export const useCategoriesData = () => {
  const ctx = useContext(CategoriesDataContext);
  if (!ctx) {
    throw new Error('useCategoriesData must be used within a DataProvider');
  }

  return ctx;
};

export const useTagsData = () => {
  const ctx = useContext(TagsDataContext);
  if (ctx === null) {
    throw new Error('useTagsData must be used within a DataProvider');
  }

  return ctx;
};

export const useTemplatesData = () => {
  const ctx = useContext(TemplatesDataContext);
  if (ctx === null) {
    throw new Error('useTemplatesData must be used within a DataProvider');
  }

  return ctx;
};

export const useRecurringData = () => {
  const ctx = useContext(RecurringDataContext);
  if (!ctx) {
    throw new Error('useRecurringData must be used within a DataProvider');
  }

  return ctx;
};

export const useGoalsData = () => {
  const ctx = useContext(GoalsDataContext);
  if (ctx === null) {
    throw new Error('useGoalsData must be used within a DataProvider');
  }

  return ctx;
};

export const useAccountsData = () => {
  const ctx = useContext(AccountsDataContext);
  if (!ctx) {
    throw new Error('useAccountsData must be used within a DataProvider');
  }

  return ctx;
};

export const useDebtsData = () => {
  const ctx = useContext(DebtsDataContext);
  if (ctx === null) {
    throw new Error('useDebtsData must be used within a DataProvider');
  }

  return ctx;
};

export const useCategoryBudgetsData = () => {
  const ctx = useContext(CategoryBudgetsDataContext);
  if (ctx === null) {
    throw new Error('useCategoryBudgetsData must be used within a DataProvider');
  }

  return ctx;
};

export const useNoSpendDaysData = () => {
  const ctx = useContext(NoSpendDaysDataContext);
  if (ctx === null) {
    throw new Error('useNoSpendDaysData must be used within a DataProvider');
  }

  return ctx;
};
