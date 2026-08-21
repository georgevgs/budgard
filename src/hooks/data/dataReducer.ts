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
import type { DataSnapshot } from '@/lib/dataCache';

// One shape for the whole data layer, replacing twenty-one separate useState
// calls.
//
// The point is not fewer variables — it is that the three things this layer
// actually does to its state are now three named transitions instead of
// twenty-odd setter calls scattered across a fetch, an effect and a render-
// time adjust. "Hydrate from the snapshot", "clear on sign-out" and "apply
// what the first fetch returned" were each spelled out longhand in a
// different place, which is how they drifted apart: the sign-out reset had
// to be audited by hand against the state list every time a field was added,
// and twice it was not.

export type DataState = {
  categories: Category[];
  expenses: Expense[];
  incomes: Expense[];
  recurringExpenses: RecurringExpense[];
  recurringIncomes: RecurringExpense[];
  tags: Tag[];
  noSpendDays: NoSpendDay[];
  templates: ExpenseTemplate[];
  goals: Goal[];
  accounts: Account[];
  accountBalances: AccountBalance[];
  debts: Debt[];
  categoryBudgets: CategoryBudget[];
  monthlyBudget: number | null;
  defaultCurrency: string;
  defaultSavingsPct: number | null;
  dailyReminderHour: number | null;
  notificationPreferences: NotificationPreferences;
  isInitialized: boolean;
  // Sticky once true — flips false only on the sign-out reset, never on a
  // background refetch, so /goals, /networth and /debts don't blank on a
  // foreground visibility refresh.
  isSecondaryLoaded: boolean;
  // Sticky in the same way: once the pre-cutoff tail is in state it stays for
  // the session, so a refetch never re-opens the "loading older transactions"
  // placeholder.
  isHistoryLoaded: boolean;
};

// Every collection empty, every scalar at its default. This is also the
// sign-out state, which is the point: the reset can no longer fall out of step
// with the field list, because it *is* the field list.
export const EMPTY_DATA: DataState = {
  categories: [],
  expenses: [],
  incomes: [],
  recurringExpenses: [],
  recurringIncomes: [],
  tags: [],
  noSpendDays: [],
  templates: [],
  goals: [],
  accounts: [],
  accountBalances: [],
  debts: [],
  categoryBudgets: [],
  monthlyBudget: null,
  defaultCurrency: 'EUR',
  defaultSavingsPct: null,
  notificationPreferences: {},
  dailyReminderHour: null,
  isInitialized: false,
  isSecondaryLoaded: false,
  isHistoryLoaded: false,
};

// A value or an updater, matching what a useState setter accepts — the
// dataOps hooks pass functional updates for optimistic writes and must keep
// being able to.
type Updater<T> = T | ((previous: T) => T);

// A union over the keys rather than `key: keyof DataState`, so the value is
// checked against the field it is being written to. Without this every setter
// collapses to the same signature and the type system stops helping.
type SetAction = {
  [K in keyof DataState]: {
    type: 'set';
    key: K;
    value: Updater<DataState[K]>;
  };
}[keyof DataState];

// The setter surface consumers see, derived from the state shape so a new
// field cannot be added without its setter appearing.
export type DataSetters = {
  [K in keyof DataState as `set${Capitalize<K>}`]: (
    value: Updater<DataState[K]>,
  ) => void;
};

export type DataAction =
  // One field, from a consumer's setter. The generic case.
  | SetAction
  // Everything the locally cached snapshot holds, in one commit.
  | { type: 'hydrate'; snapshot: DataSnapshot }
  // Sign-out. Nothing survives it.
  | { type: 'reset' }
  // What the first stage of a boot fetch returned.
  | { type: 'applyPrimary'; values: Partial<DataState> };

export const dataReducer = (
  state: DataState,
  action: DataAction,
): DataState => {
  if (action.type === 'reset') {
    return EMPTY_DATA;
  }

  if (action.type === 'hydrate') {
    return {
      ...state,
      ...pickSnapshotFields(action.snapshot),
      isInitialized: true,
      isSecondaryLoaded: action.snapshot.secondaryLoaded,
    };
  }

  if (action.type === 'applyPrimary') {
    return { ...state, ...action.values };
  }

  // The one cast in here. A mapped-key union cannot be narrowed to a single
  // K by the compiler, so the read and write are widened locally — the
  // boundary above and the setters below stay fully checked.
  const key = action.key as keyof DataState;
  const previous = state[key] as unknown;
  const next = resolve(action.value as Updater<unknown>, previous);
  // Bail out when nothing moved. A refetch that returns an identical array
  // still produces a new reference, and without this every consumer of that
  // slice re-renders for a fetch that changed nothing.
  if (next === previous) {
    return state;
  }

  return { ...state, [key]: next };
};

// --- Helpers ---

const resolve = <T,>(value: Updater<T>, previous: T): T => {
  if (typeof value === 'function') {
    return (value as (previous: T) => T)(previous);
  }

  return value;
};

// The snapshot carries a `secondaryLoaded` flag alongside the data, so it is
// not spread wholesale — that flag is state, not a collection, and belongs to
// the transition rather than to the payload.
const pickSnapshotFields = (snapshot: DataSnapshot): Partial<DataState> => ({
  categories: snapshot.categories,
  expenses: snapshot.expenses,
  incomes: snapshot.incomes,
  recurringExpenses: snapshot.recurringExpenses,
  recurringIncomes: snapshot.recurringIncomes,
  tags: snapshot.tags,
  templates: snapshot.templates,
  categoryBudgets: snapshot.categoryBudgets,
  accounts: snapshot.accounts,
  goals: snapshot.goals,
  accountBalances: snapshot.accountBalances,
  debts: snapshot.debts,
  noSpendDays: snapshot.noSpendDays,
  monthlyBudget: snapshot.monthlyBudget,
  defaultCurrency: snapshot.defaultCurrency,
  defaultSavingsPct: snapshot.defaultSavingsPct,
  dailyReminderHour: snapshot.dailyReminderHour,
  notificationPreferences: snapshot.notificationPreferences,
});

// The locally cached snapshot is every data field plus a flag describing how
// far the fetch had got — i.e. the state minus the two booleans that describe
// the fetch rather than the data. Deriving it here rather than listing the
// fields at the call site removes the last place the field list was written
// out by hand.
export const toSnapshot = (state: DataState): DataSnapshot => {
  const { isInitialized, isSecondaryLoaded, isHistoryLoaded, ...data } = state;
  void isInitialized;
  void isHistoryLoaded;

  return { ...data, secondaryLoaded: isSecondaryLoaded };
};

// Builds the per-field setter surface over a dispatch. Written out rather than
// generated from the state keys: a loop would be a third of the lines, but
// `setExpenses` would then have no definition to jump to, and the type below
// already makes it impossible for a field to be added without its setter.
//
// dispatch is stable for the lifetime of the reducer, so the result of this
// only needs building once.
export const createSetters = (
  dispatch: (action: DataAction) => void,
): DataSetters => ({
  setCategories: (value) => dispatch({ type: 'set', key: 'categories', value }),
  setExpenses: (value) => dispatch({ type: 'set', key: 'expenses', value }),
  setIncomes: (value) => dispatch({ type: 'set', key: 'incomes', value }),
  setRecurringExpenses: (value) => dispatch({ type: 'set', key: 'recurringExpenses', value }),
  setRecurringIncomes: (value) => dispatch({ type: 'set', key: 'recurringIncomes', value }),
  setTags: (value) => dispatch({ type: 'set', key: 'tags', value }),
  setNoSpendDays: (value) => dispatch({ type: 'set', key: 'noSpendDays', value }),
  setTemplates: (value) => dispatch({ type: 'set', key: 'templates', value }),
  setGoals: (value) => dispatch({ type: 'set', key: 'goals', value }),
  setAccounts: (value) => dispatch({ type: 'set', key: 'accounts', value }),
  setAccountBalances: (value) => dispatch({ type: 'set', key: 'accountBalances', value }),
  setDebts: (value) => dispatch({ type: 'set', key: 'debts', value }),
  setCategoryBudgets: (value) => dispatch({ type: 'set', key: 'categoryBudgets', value }),
  setMonthlyBudget: (value) => dispatch({ type: 'set', key: 'monthlyBudget', value }),
  setDefaultCurrency: (value) => dispatch({ type: 'set', key: 'defaultCurrency', value }),
  setDefaultSavingsPct: (value) => dispatch({ type: 'set', key: 'defaultSavingsPct', value }),
  setDailyReminderHour: (value) => dispatch({ type: 'set', key: 'dailyReminderHour', value }),
  setNotificationPreferences: (value) => dispatch({ type: 'set', key: 'notificationPreferences', value }),
  setIsInitialized: (value) => dispatch({ type: 'set', key: 'isInitialized', value }),
  setIsSecondaryLoaded: (value) => dispatch({ type: 'set', key: 'isSecondaryLoaded', value }),
  setIsHistoryLoaded: (value) => dispatch({ type: 'set', key: 'isHistoryLoaded', value }),
});
