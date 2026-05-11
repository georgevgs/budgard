import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
  useCallback,
} from 'react';
import * as Sentry from '@sentry/react';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
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
import { useToast } from '@/hooks/useToast';

type DataState = {
  categories: Category[];
  // Derived: categories.type === 'expense' (or null/undefined for legacy rows)
  expenseCategories: Category[];
  // Derived: categories.type === 'income'
  incomeCategories: Category[];
  expenses: Expense[];
  incomes: Expense[];
  recurringExpenses: RecurringExpense[];
  recurringIncomes: RecurringExpense[];
  tags: Tag[];
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
  isLoading: boolean;
  isInitialized: boolean;
  isSecondaryLoaded: boolean;
};

// Actions never change reference after mount (setters are stable, refresh
// callbacks have stable deps). Splitting them into their own context lets
// action-only consumers (forms, useDataOperations) skip re-renders triggered
// by data mutations.
type DataActions = {
  refreshData: () => Promise<void>;
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
  setCategoryBudgets: Dispatch<SetStateAction<CategoryBudget[]>>;
  setMonthlyBudget: Dispatch<SetStateAction<number | null>>;
  setDefaultCurrency: Dispatch<SetStateAction<string>>;
  setDefaultSavingsPct: Dispatch<SetStateAction<number | null>>;
  setDailyReminderHour: Dispatch<SetStateAction<number | null>>;
};

// Slow-changing scalars that handlers need (mostly for optimistic rollback).
// Carved out so consumers don't re-render on every expense/income mutation.
type DataConfig = {
  isInitialized: boolean;
  // Flips true after the deferred stage finishes loading goals, accounts,
  // accountBalances and debts. Views that depend on those (GoalsList,
  // NetWorthView, DebtsView) wait on this before rendering content.
  isSecondaryLoaded: boolean;
  monthlyBudget: number | null;
  defaultCurrency: string;
  defaultSavingsPct: number | null;
  dailyReminderHour: number | null;
};

type DataContextType = DataState & DataActions;

const DataContext = createContext<DataContextType | null>(null);
const DataActionsContext = createContext<DataActions | null>(null);
const DataConfigContext = createContext<DataConfig | null>(null);

// Per-slice contexts. Granular subscriptions: a component reading
// ExpensesDataContext only re-renders when expenses change, not when incomes
// or tags do. The combined DataContext above is kept for back-compat; new
// consumers should prefer these scoped hooks.
const ExpensesDataContext = createContext<Expense[] | null>(null);
const IncomesDataContext = createContext<Expense[] | null>(null);
type CategoriesSlice = {
  categories: Category[];
  expenseCategories: Category[];
  incomeCategories: Category[];
};
const CategoriesDataContext = createContext<CategoriesSlice | null>(null);
const TagsDataContext = createContext<Tag[] | null>(null);
const TemplatesDataContext = createContext<ExpenseTemplate[] | null>(null);
type RecurringSlice = {
  recurringExpenses: RecurringExpense[];
  recurringIncomes: RecurringExpense[];
};
const RecurringDataContext = createContext<RecurringSlice | null>(null);
const GoalsDataContext = createContext<Goal[] | null>(null);
type AccountsSlice = {
  accounts: Account[];
  accountBalances: AccountBalance[];
};
const AccountsDataContext = createContext<AccountsSlice | null>(null);
const DebtsDataContext = createContext<Debt[] | null>(null);
const CategoryBudgetsDataContext = createContext<CategoryBudget[] | null>(null);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Expense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<
    RecurringExpense[]
  >([]);
  const [recurringIncomes, setRecurringIncomes] = useState<RecurringExpense[]>(
    [],
  );
  const [tags, setTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState<string>('EUR');
  const [defaultSavingsPct, setDefaultSavingsPct] = useState<number | null>(
    null,
  );
  const [dailyReminderHour, setDailyReminderHour] = useState<number | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  // Sticky once true — flips false only on logout reset, never on background
  // refetches, so /goals, /networth and /debts don't blank on foreground
  // visibility refreshes.
  const [isSecondaryLoaded, setIsSecondaryLoaded] = useState(false);

  // Expose latest data via refs so handlers can read it inside async callbacks
  // without subscribing to context updates (keeps useDataOperations stable).
  const expensesRef = useRef<Expense[]>(expenses);
  expensesRef.current = expenses;
  const incomesRef = useRef<Expense[]>(incomes);
  incomesRef.current = incomes;
  // Tracks isInitialized inside async callbacks without stale closures.
  // We use this to decide whether a fetch should blank views with the loading
  // skeleton (first paint) or refresh silently in the background.
  const isInitializedRef = useRef(isInitialized);
  isInitializedRef.current = isInitialized;

  // Categories without an explicit 'income' type belong to expenses (back-compat).
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type !== 'income'),
    [categories],
  );

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories],
  );
  // Tracks the AbortController for the current in-flight fetchData call so we
  // can cancel proactively when the app is backgrounded on iOS.
  const abortControllerRef = useRef<AbortController | null>(null);
  // Timestamp of the last successful full fetch and whether the most recent
  // fetch was aborted. Used by the visibility handler to skip redundant
  // refetches when the user briefly alt-tabs.
  const lastFetchAtRef = useRef<number>(0);
  const wasAbortedRef = useRef<boolean>(false);

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) {
      return;
    }

    // Cancel any previous in-flight fetch before starting a new one.
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Only show the global loading flag on the very first fetch. Subsequent
    // refreshes (e.g. visibility-driven on foreground) should be silent so
    // already-rendered views don't blank back to a skeleton.
    if (!isInitializedRef.current) {
      setIsLoading(true);
    }

    // Two-stage expense/income fetch: load the last RECENT_MONTHS of history
    // first so the user sees a working app fast, then top up older rows in
    // the background. Search across all months still works once stage 2
    // resolves; until then, "all months" search is limited to recent rows.
    const RECENT_MONTHS = 12;
    const recentCutoffDate = new Date();
    recentCutoffDate.setMonth(recentCutoffDate.getMonth() - RECENT_MONTHS);
    const recentCutoff = recentCutoffDate.toISOString().split('T')[0];

    try {
      // Stage 1: critical fetch — everything needed by the four bottom-nav
      // tabs (expenses, income, recurring, analytics). Secondary domains
      // (goals/accounts/balances/debts) are routed via the header AppMenu
      // and load in stage 1.5 below.
      const [
        categoriesData,
        expensesData,
        incomesData,
        recurringExpensesData,
        recurringIncomesData,
        budgetData,
        tagsData,
        templatesData,
        categoryBudgetsData,
      ] = await Promise.all([
        dataService.getCategories(controller.signal),
        dataService.getExpenses(controller.signal, recentCutoff),
        dataService.getIncomes(controller.signal, recentCutoff),
        dataService.getRecurringExpenses(controller.signal),
        dataService.getRecurringIncomes(controller.signal),
        dataService.getBudget(controller.signal),
        dataService.getTags(controller.signal),
        dataService.getTemplates(controller.signal),
        dataService.getCategoryBudgets(controller.signal),
      ]);

      // React 18+ automatically batches these state updates
      setCategories(categoriesData);
      setExpenses(expensesData);
      setIncomes(incomesData);
      setRecurringExpenses(recurringExpensesData);
      setRecurringIncomes(recurringIncomesData);
      setTags(tagsData);
      setTemplates(templatesData);
      setCategoryBudgets(categoryBudgetsData);
      setMonthlyBudget(budgetData?.monthly_amount ?? null);
      setDefaultCurrency(budgetData?.default_currency ?? 'EUR');
      setDefaultSavingsPct(budgetData?.default_savings_pct ?? null);
      setDailyReminderHour(budgetData?.daily_reminder_hour ?? null);
      setIsInitialized(true);
      setIsLoading(false);
      lastFetchAtRef.current = Date.now();
      wasAbortedRef.current = false;

      // Stage 1.5: domains used by AppMenu-only views (goals, networth,
      // debts). Fired immediately after stage 1 but doesn't block first paint.
      Promise.all([
        dataService.getGoals(controller.signal),
        dataService.getAccounts(controller.signal),
        dataService.getAllAccountBalances(controller.signal),
        dataService.getDebts(controller.signal),
      ])
        .then(([goalsData, accountsData, balancesData, debtsData]) => {
          if (controller.signal.aborted) {
            return;
          }
          setGoals(goalsData);
          setAccounts(accountsData);
          setAccountBalances(balancesData);
          setDebts(debtsData);
          setIsSecondaryLoaded(true);
        })
        .catch((error) => {
          if (isAbortError(error)) {
            return;
          }
          Sentry.captureException(error, {
            tags: { context: 'fetchSecondaryDomains' },
          });
        });

      // Stage 2: top up older expenses/incomes in the background. Append
      // to whatever is in state now (which may include user mutations made
      // during stage 2).
      Promise.all([
        dataService.getExpenses(controller.signal, undefined, recentCutoff),
        dataService.getIncomes(controller.signal, undefined, recentCutoff),
      ])
        .then(([olderExpenses, olderIncomes]) => {
          if (controller.signal.aborted) {
            return;
          }
          // Dedupe by id: if a refreshExpenses/refreshIncomes ran concurrently
          // (e.g. user deleted a recurring expense, bulk-imported, or rolled
          // back a category delete) it will have replaced state with full
          // history, so older* may already be present.
          if (olderExpenses.length > 0) {
            setExpenses((prev) => mergeUniqueById(prev, olderExpenses));
          }
          if (olderIncomes.length > 0) {
            setIncomes((prev) => mergeUniqueById(prev, olderIncomes));
          }
        })
        .catch((error) => {
          if (isAbortError(error)) {
            return;
          }
          Sentry.captureException(error, {
            tags: { context: 'fetchOlderTransactions' },
          });
        });
    } catch (error) {
      // iOS PWA aborts in-flight requests when the app is backgrounded. The
      // AbortError may be a raw DOMException or wrapped by Supabase into an
      // object with { message: "AbortError: ..." }. Silently ignore both —
      // the visibilitychange listener retries when the app comes to foreground.
      if (isAbortError(error)) {
        wasAbortedRef.current = true;
        setIsLoading(false);
        return;
      }
      Sentry.captureException(error, { tags: { context: 'fetchData' } });
      console.error('Failed to load data:', error);
      toastRef.current({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  const refreshData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const refreshExpenses = useCallback(async () => {
    try {
      const expensesData = await dataService.getExpenses();
      setExpenses(expensesData);
    } catch (error) {
      Sentry.captureException(error, { tags: { context: 'refreshExpenses' } });
      console.error('Failed to refresh expenses:', error);
    }
  }, []);

  const refreshIncomes = useCallback(async () => {
    try {
      const incomesData = await dataService.getIncomes();
      setIncomes(incomesData);
    } catch (error) {
      Sentry.captureException(error, { tags: { context: 'refreshIncomes' } });
      console.error('Failed to refresh incomes:', error);
    }
  }, []);

  const refreshAccounts = useCallback(async () => {
    try {
      const [accountsData, balancesData] = await Promise.all([
        dataService.getAccounts(),
        dataService.getAllAccountBalances(),
      ]);
      setAccounts(accountsData);
      setAccountBalances(balancesData);
    } catch (error) {
      Sentry.captureException(error, { tags: { context: 'refreshAccounts' } });
      console.error('Failed to refresh accounts:', error);
    }
  }, []);

  const refreshDebts = useCallback(async () => {
    try {
      const debtsData = await dataService.getDebts();
      setDebts(debtsData);
    } catch (error) {
      Sentry.captureException(error, { tags: { context: 'refreshDebts' } });
      console.error('Failed to refresh debts:', error);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (session?.user?.id && !isInitialized) {
      fetchData();
      return;
    }

    if (!session) {
      abortControllerRef.current?.abort();
      setCategories([]);
      setExpenses([]);
      setIncomes([]);
      setRecurringExpenses([]);
      setRecurringIncomes([]);
      setTags([]);
      setTemplates([]);
      setGoals([]);
      setAccounts([]);
      setAccountBalances([]);
      setDebts([]);
      setCategoryBudgets([]);
      setMonthlyBudget(null);
      setDefaultCurrency('EUR');
      setDefaultSavingsPct(null);
      setIsInitialized(false);
      setIsSecondaryLoaded(false);
      setIsLoading(false);
    }
  }, [isAuthLoading, session, isInitialized, fetchData]);

  // Page Visibility API: proactively abort on background, retry on foreground.
  // On iOS PWA the OS aborts network requests mid-flight when the app is
  // backgrounded. By owning the abort ourselves we get a clean, intentional
  // cancellation before the OS does it uncontrollably, and we retry as soon
  // as the user brings the app back — but only when the data is actually
  // stale or the previous fetch was cancelled. Otherwise quick alt-tabs
  // would trigger a full refetch storm.
  useEffect(() => {
    // Skip refetch on foreground if last fetch was within this window AND
    // the previous fetch wasn't cancelled. Tuned for "quick alt-tab" use.
    const FRESH_WINDOW_MS = 30_000;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        abortControllerRef.current?.abort();
        return;
      }

      if (!session?.user?.id) {
        return;
      }

      const sinceLastFetch = Date.now() - lastFetchAtRef.current;
      const needsRefetch =
        wasAbortedRef.current || sinceLastFetch >= FRESH_WINDOW_MS;

      if (needsRefetch) {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.user?.id, fetchData]);

  const actions = useMemo<DataActions>(
    () => ({
      refreshData,
      refreshExpenses,
      refreshIncomes,
      refreshAccounts,
      refreshDebts,
      expensesRef,
      incomesRef,
      setCategories,
      setExpenses,
      setIncomes,
      setRecurringExpenses,
      setRecurringIncomes,
      setTags,
      setTemplates,
      setGoals,
      setAccounts,
      setAccountBalances,
      setDebts,
      setCategoryBudgets,
      setMonthlyBudget,
      setDefaultCurrency,
      setDefaultSavingsPct,
      setDailyReminderHour,
    }),
    [refreshData, refreshExpenses, refreshIncomes, refreshAccounts, refreshDebts],
  );

  const config = useMemo<DataConfig>(
    () => ({
      isInitialized,
      isSecondaryLoaded,
      monthlyBudget,
      defaultCurrency,
      defaultSavingsPct,
      dailyReminderHour,
    }),
    [
      isInitialized,
      isSecondaryLoaded,
      monthlyBudget,
      defaultCurrency,
      defaultSavingsPct,
      dailyReminderHour,
    ],
  );

  const value = useMemo(
    () => ({
      categories,
      expenseCategories,
      incomeCategories,
      expenses,
      incomes,
      recurringExpenses,
      recurringIncomes,
      tags,
      templates,
      goals,
      accounts,
      accountBalances,
      debts,
      categoryBudgets,
      monthlyBudget,
      defaultCurrency,
      defaultSavingsPct,
      dailyReminderHour,
      isLoading,
      isInitialized,
      isSecondaryLoaded,
      ...actions,
    }),
    [
      categories,
      expenseCategories,
      incomeCategories,
      expenses,
      incomes,
      recurringExpenses,
      recurringIncomes,
      tags,
      templates,
      goals,
      accounts,
      accountBalances,
      debts,
      categoryBudgets,
      monthlyBudget,
      defaultCurrency,
      defaultSavingsPct,
      dailyReminderHour,
      isLoading,
      isInitialized,
      isSecondaryLoaded,
      actions,
    ],
  );

  const categoriesSlice = useMemo<CategoriesSlice>(
    () => ({ categories, expenseCategories, incomeCategories }),
    [categories, expenseCategories, incomeCategories],
  );
  const recurringSlice = useMemo<RecurringSlice>(
    () => ({ recurringExpenses, recurringIncomes }),
    [recurringExpenses, recurringIncomes],
  );
  const accountsSlice = useMemo<AccountsSlice>(
    () => ({ accounts, accountBalances }),
    [accounts, accountBalances],
  );

  return (
    <DataActionsContext.Provider value={actions}>
      <DataConfigContext.Provider value={config}>
        <ExpensesDataContext.Provider value={expenses}>
          <IncomesDataContext.Provider value={incomes}>
            <CategoriesDataContext.Provider value={categoriesSlice}>
              <TagsDataContext.Provider value={tags}>
                <TemplatesDataContext.Provider value={templates}>
                  <RecurringDataContext.Provider value={recurringSlice}>
                    <GoalsDataContext.Provider value={goals}>
                      <AccountsDataContext.Provider value={accountsSlice}>
                        <DebtsDataContext.Provider value={debts}>
                          <CategoryBudgetsDataContext.Provider
                            value={categoryBudgets}
                          >
                            <DataContext.Provider value={value}>
                              {children}
                            </DataContext.Provider>
                          </CategoryBudgetsDataContext.Provider>
                        </DebtsDataContext.Provider>
                      </AccountsDataContext.Provider>
                    </GoalsDataContext.Provider>
                  </RecurringDataContext.Provider>
                </TemplatesDataContext.Provider>
              </TagsDataContext.Provider>
            </CategoriesDataContext.Provider>
          </IncomesDataContext.Provider>
        </ExpensesDataContext.Provider>
      </DataConfigContext.Provider>
    </DataActionsContext.Provider>
  );
};

const mergeUniqueById = <T extends { id: string }>(
  prev: T[],
  incoming: T[],
): T[] => {
  const existingIds = new Set(prev.map((item) => item.id));
  const fresh = incoming.filter((item) => !existingIds.has(item.id));

  if (fresh.length === 0) {
    return prev;
  }

  return [...prev, ...fresh];
};

const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.message.includes('AbortError'))
    return true;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    String((error as Record<string, unknown>).message).includes('AbortError')
  )
    return true;
  return false;
};

export const useData = () => {
  const context = useContext(DataContext);

  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }

  return context;
};

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
