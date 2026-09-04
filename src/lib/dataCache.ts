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
import { toIsoDate } from '@/lib/dates';

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
  noSpendDays: NoSpendDay[];
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
  version: string;
  userId: string;
  savedAt: string;
  data: DataSnapshot;
};

const CACHE_KEY = 'budgard-data-snapshot';

// Structural version of the snapshot envelope itself. This changes only when
// DataSnapshot stops being backwards-compatible; ordinary app releases must
// keep the last good snapshot so an update does not turn a warm launch into a
// full-screen data load. isStructurallyValid below remains the final guard
// against a stale or malformed payload when a schema bump is missed.
const CACHE_SCHEMA = 1;
const CACHE_VERSION = String(CACHE_SCHEMA);

// Snapshots older than this are discarded: painting week-old numbers and
// then swapping them for fresh ones is more confusing than a loading state.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Mirror the fetch pipeline's stage-1 window so a hydrated boot looks exactly
// like a fresh stage-1 result; older history still streams in via stage 2.
// Exported so DataContext's fetch pipeline uses the identical window — a
// single source of truth prevents the cache and the network fetch from
// trimming to different horizons (which would make rows flicker on boot).
const RECENT_MONTHS = 12;

export const getRecentCutoff = (): string => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RECENT_MONTHS);

  // toIsoDate, not toISOString().split('T')[0]: transaction dates are calendar
  // days in the user's timezone, so a cutoff derived from the UTC day compares
  // against them off by one for part of every day. It is only a horizon, and
  // the cache and the fetch both call this so they never disagree with each
  // other — but lib/dates.ts is the single answer to "which day is it" and
  // this was the one place still answering it separately.
  return toIsoDate(cutoff);
};

// True when a YYYY-MM month's rows only arrive with the stage-2 history
// top-up, so an empty view means "not here yet" rather than "nothing here".
// The cutoff month itself counts as pending: the cutoff falls mid-month, so
// stage 1 covers only part of it. Erring this way costs one extra month of
// placeholder during the couple of seconds stage 2 is in flight, where the
// other direction would show a month as empty while rows were still landing.
export const isMonthPendingHistory = (month: string): boolean => {
  return month <= getRecentCutoff().slice(0, 7);
};

export const loadDataSnapshot = (userId: string): DataSnapshot | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }

    const stored = JSON.parse(raw) as StoredSnapshot;
    if (!isCompatibleVersion(stored.version)) {
      return null;
    }
    if (stored.userId !== userId) {
      // A snapshot belonging to a different account must never linger in
      // localStorage once someone else is using the app (shared device, or a
      // direct A→B re-auth with no sign-out in between). Purge it now.
      clearDataSnapshot();

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

// True when loadDataSnapshot would hydrate for this user (same user, version,
// age and shape checks). Lets the boot effect decide failure-toast suppression
// without re-plumbing the render-time hydration result into the effect.
export const hasDataSnapshot = (userId: string): boolean => {
  return loadDataSnapshot(userId) !== null;
};

export const saveDataSnapshot = (userId: string, data: DataSnapshot): void => {
  const cutoff = getRecentCutoff();
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
  'noSpendDays',
] as const;

// Releases before this cache stopped following package.json wrote versions as
// "<schema>:<app-version>". Accept that legacy spelling for the current schema
// so the first release containing this fix can reuse the snapshot already on
// the device instead of causing one last cold boot.
const isCompatibleVersion = (version: unknown): boolean => {
  if (version === CACHE_VERSION) return true;
  if (typeof version !== 'string') return false;

  return version.startsWith(`${CACHE_VERSION}:`);
};

const NULLABLE_NUMBER_FIELDS = [
  'monthlyBudget',
  'defaultSavingsPct',
  'dailyReminderHour',
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
  if (
    typeof record.defaultCurrency !== 'string' ||
    record.defaultCurrency === ''
  ) {
    return false;
  }
  if (typeof record.secondaryLoaded !== 'boolean') {
    return false;
  }
  // Scalar fields are number-or-null; reject anything else so a malformed or
  // older-shape snapshot can't hydrate e.g. a string into monthlyBudget and
  // turn every budget calculation into NaN for the session.
  for (const field of NULLABLE_NUMBER_FIELDS) {
    const value = record[field];
    if (value !== null && typeof value !== 'number') {
      return false;
    }
  }
  if (
    typeof record.notificationPreferences !== 'object' ||
    record.notificationPreferences === null
  ) {
    return false;
  }

  return true;
};
