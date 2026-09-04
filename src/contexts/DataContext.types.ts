import type { Dispatch, SetStateAction } from 'react';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import type { RecurringExpense } from '@/types/RecurringExpense';
import type { Tag } from '@/types/Tag';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';
import type { Goal } from '@/types/Goal';
import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';
import type { Debt } from '@/types/Debt';
import type { NoSpendDay } from '@/types/NoSpendDay';
import type { CategoryBudget } from '@/types/CategoryBudget';
import type { NotificationPreferences } from '@/types/Budget';

// The combined DataState/DataContextType pair died with the useData() shim —
// consumers subscribe to the per-slice contexts in DataContext.tsx instead.

// Actions never change reference after mount (setters are stable, refresh
// callbacks have stable deps). Splitting them into their own context lets
// action-only consumers (forms, dataOps hooks) skip re-renders triggered
// by data mutations.
export type DataActions = {
  refreshData: () => Promise<void>;
  loadHistory: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
  refreshIncomes: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  refreshDebts: () => Promise<void>;
  // Refs to latest data — read inside callbacks without triggering re-renders.
  expensesRef: { readonly current: Expense[] };
  incomesRef: { readonly current: Expense[] };
  setCategories: Dispatch<SetStateAction<Category[]>>;
  setExpenses: Dispatch<SetStateAction<Expense[]>>;
  setIncomes: Dispatch<SetStateAction<Expense[]>>;
  setRecurringExpenses: Dispatch<SetStateAction<RecurringExpense[]>>;
  setRecurringIncomes: Dispatch<SetStateAction<RecurringExpense[]>>;
  setTags: Dispatch<SetStateAction<Tag[]>>;
  setTemplates: Dispatch<SetStateAction<ExpenseTemplate[]>>;
  setGoals: Dispatch<SetStateAction<Goal[]>>;
  setAccounts: Dispatch<SetStateAction<Account[]>>;
  setAccountBalances: Dispatch<SetStateAction<AccountBalance[]>>;
  setDebts: Dispatch<SetStateAction<Debt[]>>;
  setNoSpendDays: Dispatch<SetStateAction<NoSpendDay[]>>;
  setCategoryBudgets: Dispatch<SetStateAction<CategoryBudget[]>>;
  setMonthlyBudget: Dispatch<SetStateAction<number | null>>;
  setDefaultCurrency: Dispatch<SetStateAction<string>>;
  setDefaultSavingsPct: Dispatch<SetStateAction<number | null>>;
  setDailyReminderHour: Dispatch<SetStateAction<number | null>>;
  setNotificationPreferences: Dispatch<SetStateAction<NotificationPreferences>>;
};

// Slow-changing scalars that handlers need (mostly for optimistic rollback).
// Carved out so consumers don't re-render on every expense/income mutation.
export type DataConfig = {
  isInitialized: boolean;
  // Flips true after the deferred stage finishes loading goals, accounts,
  // accountBalances and debts. Views that depend on those (GoalsList,
  // NetWorthView, DebtsView) wait on this before rendering content.
  isSecondaryLoaded: boolean;
  // Flips true once a screen has requested the pre-cutoff transaction tail and
  // it has landed (or definitively failed). Until then only the recent window
  // is in state, so consumers requesting older periods show "still loading"
  // instead of an incorrect empty state. Resolves on failure too: a placeholder
  // that never goes away is worse than an honest empty state.
  isHistoryLoaded: boolean;
  monthlyBudget: number | null;
  defaultCurrency: string;
  defaultSavingsPct: number | null;
  dailyReminderHour: number | null;
  notificationPreferences: NotificationPreferences;
};

export type CategoriesSlice = {
  categories: Category[];
  expenseCategories: Category[];
  incomeCategories: Category[];
};

export type RecurringSlice = {
  recurringExpenses: RecurringExpense[];
  recurringIncomes: RecurringExpense[];
};

export type AccountsSlice = {
  accounts: Account[];
  accountBalances: AccountBalance[];
};
