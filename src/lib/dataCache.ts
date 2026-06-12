import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import type { RecurringExpense } from '@/types/RecurringExpense';
import type { Tag } from '@/types/Tag';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';
import type { Goal } from '@/types/Goal';
import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';
import type { Debt } from '@/types/Debt';
import type { CategoryBudget } from '@/types/CategoryBudget';
import type { NotificationPreferences } from '@/types/Budget';

// Snapshot of the DataContext bootstrap payload, persisted locally so the
// next app open can paint with real data immediately while the network
// fetch runs in the background (cache-then-network).
export type DataSnapshot = {
  categories: Category[];
  expenses: Expense[];
  incomes: Expense[];
  recurringExpenses: RecurringExpense[];
  recurringIncomes: RecurringExpense[];
  tags: Tag[];
  templates: ExpenseTemplate[];
  categoryBudgets: CategoryBudget[];
  accounts: Account[];
  goals: Goal[];
  accountBalances: AccountBalance[];
  debts: Debt[];
  monthlyBudget: number | null;
  defaultCurrency: string;
  defaultSavingsPct: number | null;
  dailyReminderHour: number | null;
  notificationPreferences: NotificationPreferences;
  // Whether the deferred fetch stage (goals, account balances, debts) had
  // completed when this snapshot was taken. Hydrating an incomplete snapshot
  // must not flip isSecondaryLoaded, or those views would flash an empty
  // state instead of their loading skeleton.
  secondaryLoaded: boolean;
};

type StoredSnapshot = {
  version: number;
  userId: string;
  savedAt: string;
  data: DataSnapshot;
};

const CACHE_KEY = 'budgard-data-snapshot';

// Bump whenever the shape of DataSnapshot (or any type inside it) changes in
// a way old cached payloads can't satisfy. A version mismatch simply discards
// the snapshot — the app falls back to the normal network-first boot.
const CACHE_VERSION = 1;

// Snapshots older than this are discarded: painting week-old numbers and
// then swapping them for fresh ones is more confusing than a loading state.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Mirror the fetch pipeline's stage-1 window so a hydrated boot looks exactly
// like a fresh stage-1 result; older history still streams in via stage 2.
const RECENT_MONTHS = 12;

export const loadDataSnapshot = (userId: string): DataSnapshot | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }

    const stored = JSON.parse(raw) as StoredSnapshot;
    if (stored.version !== CACHE_VERSION) {
      return null;
    }
    if (stored.userId !== userId) {
      return null;
    }

    const age = Date.now() - new Date(stored.savedAt).getTime();
    if (!Number.isFinite(age) || age < 0 || age > MAX_AGE_MS) {
      return null;
    }

    if (!isStructurallyValid(stored.data)) {
      return null;
    }

    return stored.data;
  } catch {
    return null;
  }
};

export const saveDataSnapshot = (userId: string, data: DataSnapshot): void => {
  const cutoff = recentCutoffDate();
  const stored: StoredSnapshot = {
    version: CACHE_VERSION,
    userId,
    savedAt: new Date().toISOString(),
    data: {
      ...data,
      expenses: trimToRecent(data.expenses, cutoff),
      incomes: trimToRecent(data.incomes, cutoff),
    },
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(stored));
  } catch {
    // Quota exceeded or private mode — drop the snapshot so we never keep a
    // stale one around, and let the app boot network-first as before.
    clearDataSnapshot();
  }
};

export const clearDataSnapshot = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // localStorage unavailable — nothing to clear.
  }
};

// --- Helpers ---

const recentCutoffDate = (): string => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RECENT_MONTHS);

  return cutoff.toISOString().split('T')[0];
};

// YYYY-MM-DD dates sort lexicographically, so string comparison is safe.
const trimToRecent = (transactions: Expense[], cutoff: string): Expense[] => {
  return transactions.filter((transaction) => transaction.date >= cutoff);
};

const ARRAY_FIELDS = [
  'categories',
  'expenses',
  'incomes',
  'recurringExpenses',
  'recurringIncomes',
  'tags',
  'templates',
  'categoryBudgets',
  'accounts',
  'goals',
  'accountBalances',
  'debts',
] as const;

const isStructurallyValid = (data: unknown): data is DataSnapshot => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const record = data as Record<string, unknown>;
  for (const field of ARRAY_FIELDS) {
    if (!Array.isArray(record[field])) {
      return false;
    }
  }
  if (typeof record.defaultCurrency !== 'string') {
    return false;
  }
  if (typeof record.secondaryLoaded !== 'boolean') {
    return false;
  }

  return true;
};
