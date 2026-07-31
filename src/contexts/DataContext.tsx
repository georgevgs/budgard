import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  useCallback,
} from 'react';
import * as Sentry from '@/lib/sentry';
import { useTranslation } from 'react-i18next';
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
import type { NotificationPreferences } from '@/types/Budget';
import { useToast } from '@/hooks/useToast';
import type {
  DataActions,
  DataConfig,
  CategoriesSlice,
  RecurringSlice,
  AccountsSlice,
} from '@/contexts/DataContext.types';
import {
  mergeUniqueById,
  replaceRecentWindow,
  isAbortError,
  isExpiredJwtError,
} from '@/contexts/DataContext.helpers';
import {
  loadDataSnapshot,
  saveDataSnapshot,
  clearDataSnapshot,
  getRecentCutoff,
} from '@/lib/dataCache';

const DataActionsContext = createContext<DataActions | null>(null);
const DataConfigContext = createContext<DataConfig | null>(null);

// Per-slice contexts. Granular subscriptions: a component reading
// ExpensesDataContext only re-renders when expenses change, not when incomes
// or tags do.
const ExpensesDataContext = createContext<Expense[] | null>(null);
const IncomesDataContext = createContext<Expense[] | null>(null);
const CategoriesDataContext = createContext<CategoriesSlice | null>(null);
const TagsDataContext = createContext<Tag[] | null>(null);
const TemplatesDataContext = createContext<ExpenseTemplate[] | null>(null);
const RecurringDataContext = createContext<RecurringSlice | null>(null);
const GoalsDataContext = createContext<Goal[] | null>(null);
const AccountsDataContext = createContext<AccountsSlice | null>(null);
const DebtsDataContext = createContext<Debt[] | null>(null);
const CategoryBudgetsDataContext = createContext<CategoryBudget[] | null>(null);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;

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
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>({});
  const [isInitialized, setIsInitialized] = useState(false);
  // Sticky once true — flips false only on logout reset, never on background
  // refetches, so /goals, /networth and /debts don't blank on foreground
  // visibility refreshes.
  const [isSecondaryLoaded, setIsSecondaryLoaded] = useState(false);
  // Sticky in the same way: once the pre-cutoff tail is in state it stays
  // there for the session, so a foreground refetch never re-opens the
  // "loading older transactions" placeholder.
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);

  // Expose latest data via refs so handlers can read it inside async callbacks
  // without subscribing to context updates (keeps the dataOps hooks stable).
  const expensesRef = useRef<Expense[]>(expenses);
  expensesRef.current = expenses;
  const incomesRef = useRef<Expense[]>(incomes);
  incomesRef.current = incomes;

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
  // True once cached data has been hydrated into state this session. While
  // the user is looking at hydrated data, a failed background refresh should
  // not raise a destructive "Failed to load data" toast — the offline banner
  // already covers connectivity, and the data on screen is still usable.
  const hydratedFromCacheRef = useRef(false);
  // User id whose boot sequence (cache hydration + initial fetch) already
  // ran, so token refreshes re-triggering the boot effect don't refetch.
  const bootedUserIdRef = useRef<string | null>(null);
  // User id whose stage-2 top-up (pre-cutoff history) completed this boot.
  // Old rows change rarely, so re-downloading the full history on every
  // foreground refetch is pure waste — stage 2 runs once per boot and the
  // recent window alone refreshes afterwards.
  const stage2DoneForUserRef = useRef<string | null>(null);
  // Lets the load-failure toast's "Try again" action re-invoke fetchData from
  // inside its own catch block (the callback can't reference itself while it
  // is being defined). Kept current via the assignment right below fetchData.
  const fetchDataRef = useRef<() => Promise<void>>(async () => {});

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) {
      return;
    }

    // Cancel any previous in-flight fetch before starting a new one.
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Two-stage expense/income fetch: load the last RECENT_MONTHS of history
    // first so the user sees a working app fast, then top up older rows in
    // the background. Search across all months still works once stage 2
    // resolves; until then, "all months" search is limited to recent rows.
    // Cutoff comes from the cache module so the hydrated snapshot and this
    // fetch always trim to the identical window.
    const recentCutoff = getRecentCutoff();

    try {
      // Stage 1: critical fetch — everything needed by the four bottom-nav
      // tabs (expenses, income, recurring, analytics). Accounts ride along
      // because the recurring-expense form's investment-account selector
      // would feel laggy populating a beat after stage 1.5. Other secondary
      // domains (goals/account balances/debts) load in stage 1.5 below.
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
        accountsData,
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
        dataService.getAccounts(controller.signal),
      ]);

      const stage2AlreadyDone =
        stage2DoneForUserRef.current === session.user.id;

      // React 18+ automatically batches these state updates
      setCategories(categoriesData);
      if (stage2AlreadyDone) {
        // The pre-cutoff tail already lives in state; a plain replace with
        // the recent window would wipe it until the next boot.
        setIsHistoryLoaded(true);
        setExpenses((prev) =>
          replaceRecentWindow(prev, expensesData, recentCutoff),
        );
        setIncomes((prev) =>
          replaceRecentWindow(prev, incomesData, recentCutoff),
        );
      } else {
        setExpenses(expensesData);
        setIncomes(incomesData);
      }
      setRecurringExpenses(recurringExpensesData);
      setRecurringIncomes(recurringIncomesData);
      setTags(tagsData);
      setTemplates(templatesData);
      setCategoryBudgets(categoryBudgetsData);
      setAccounts(accountsData);
      setMonthlyBudget(budgetData?.monthly_amount ?? null);
      setDefaultCurrency(budgetData?.default_currency ?? 'EUR');
      setDefaultSavingsPct(budgetData?.default_savings_pct ?? null);
      setDailyReminderHour(budgetData?.daily_reminder_hour ?? null);
      setNotificationPreferences(budgetData?.notification_preferences ?? {});
      setIsInitialized(true);
      // Fresh server data has now replaced anything hydrated from cache, so
      // stop suppressing the load-failure toast: a *later* fetch failure
      // (foreground refetch, manual refresh) should surface normally rather
      // than be silently swallowed for the rest of the session.
      hydratedFromCacheRef.current = false;
      lastFetchAtRef.current = Date.now();
      wasAbortedRef.current = false;

      // Stage 1.5: domains used by AppMenu-only views (goals, networth,
      // debts). Fired immediately after stage 1 but doesn't block first paint.
      Promise.all([
        dataService.getGoals(controller.signal),
        dataService.getAllAccountBalances(controller.signal),
        dataService.getDebts(controller.signal),
      ])
        .then(([goalsData, balancesData, debtsData]) => {
          if (controller.signal.aborted) {
            return;
          }
          setGoals(goalsData);
          setAccountBalances(balancesData);
          setDebts(debtsData);
          setIsSecondaryLoaded(true);
        })
        .catch((error) => {
          if (isAbortError(error) || isExpiredJwtError(error)) {
            return;
          }
          Sentry.captureException(error, {
            tags: { context: 'fetchSecondaryDomains' },
          });
        });

      // Stage 2: top up older expenses/incomes in the background. Append
      // to whatever is in state now (which may include user mutations made
      // during stage 2). Runs once per boot — the pre-cutoff history barely
      // changes, and re-downloading all of it on every foreground refetch
      // costs a long-history user their whole archive in bandwidth daily.
      if (!stage2AlreadyDone) {
        Promise.all([
          dataService.getExpenses(controller.signal, undefined, recentCutoff),
          dataService.getIncomes(controller.signal, undefined, recentCutoff),
        ])
          .then(([olderExpenses, olderIncomes]) => {
            if (controller.signal.aborted) {
              return;
            }
            stage2DoneForUserRef.current = session.user.id;
            setIsHistoryLoaded(true);
            // Dedupe by id: if a refreshExpenses/refreshIncomes ran
            // concurrently (e.g. user deleted a recurring expense,
            // bulk-imported, or rolled back a category delete) it will have
            // replaced state with full history, so older* may already be
            // present.
            if (olderExpenses.length > 0) {
              setExpenses((prev) => mergeUniqueById(prev, olderExpenses));
            }
            if (olderIncomes.length > 0) {
              setIncomes((prev) => mergeUniqueById(prev, olderIncomes));
            }
          })
          .catch((error) => {
            if (isAbortError(error) || isExpiredJwtError(error)) {
              return;
            }
            // Resolve the flag even on failure. The tail isn't here and won't
            // be until the next boot, so screens should fall back to their
            // normal empty state rather than promise data that isn't coming.
            setIsHistoryLoaded(true);
            Sentry.captureException(error, {
              tags: { context: 'fetchOlderTransactions' },
            });
          });
      }
    } catch (error) {
      // iOS PWA aborts in-flight requests when the app is backgrounded. The
      // AbortError may be a raw DOMException or wrapped by Supabase into an
      // object with { message: "AbortError: ..." }. Silently ignore both —
      // the visibilitychange listener retries when the app comes to foreground.
      if (isAbortError(error)) {
        wasAbortedRef.current = true;

        return;
      }
      // JWT expiry self-heals via supabase-js refresh + the visibilitychange
      // retry, so don't toast or page the user about it.
      if (isExpiredJwtError(error)) {
        return;
      }
      Sentry.captureException(error, { tags: { context: 'fetchData' } });
      console.error('Failed to load data:', error);
      // Still showing cached data from this boot (no successful fetch yet) —
      // a destructive toast over a perfectly usable view would only alarm the
      // user. The flag is cleared the moment a fetch succeeds, so failures
      // after that point still toast.
      if (hydratedFromCacheRef.current) {
        return;
      }
      toastRef.current({
        title: tRef.current('common.error'),
        description: tRef.current('common.loadDataFailed'),
        variant: 'destructive',
        action: {
          label: tRef.current('common.tryAgain'),
          onClick: () => {
            void fetchDataRef.current();
          },
        },
      });
    }
  }, [session?.user?.id]);
  fetchDataRef.current = fetchData;

  const refreshData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Cache-then-network boot: paint instantly from the locally persisted
  // snapshot of the last session, then let fetchData (fired right after)
  // replace everything with fresh server state. A cache miss is silent —
  // the app boots network-first exactly as before.
  const hydrateFromSnapshot = useCallback((userId: string) => {
    const snapshot = loadDataSnapshot(userId);
    if (!snapshot) {
      return;
    }

    setCategories(snapshot.categories);
    setExpenses(snapshot.expenses);
    setIncomes(snapshot.incomes);
    setRecurringExpenses(snapshot.recurringExpenses);
    setRecurringIncomes(snapshot.recurringIncomes);
    setTags(snapshot.tags);
    setTemplates(snapshot.templates);
    setCategoryBudgets(snapshot.categoryBudgets);
    setAccounts(snapshot.accounts);
    setGoals(snapshot.goals);
    setAccountBalances(snapshot.accountBalances);
    setDebts(snapshot.debts);
    setMonthlyBudget(snapshot.monthlyBudget);
    setDefaultCurrency(snapshot.defaultCurrency);
    setDefaultSavingsPct(snapshot.defaultSavingsPct);
    setDailyReminderHour(snapshot.dailyReminderHour);
    setNotificationPreferences(snapshot.notificationPreferences);
    hydratedFromCacheRef.current = true;
    setIsInitialized(true);
    setIsSecondaryLoaded(snapshot.secondaryLoaded);
  }, []);

  const refreshExpenses = useCallback(async () => {
    try {
      const expensesData = await dataService.getExpenses();
      setExpenses(expensesData);
    } catch (error) {
      Sentry.captureException(error, { tags: { context: 'refreshExpenses' } });
      console.error('Failed to refresh expenses:', error);
      toastRef.current({
        title: tRef.current('common.error'),
        description: tRef.current('common.refreshFailed'),
        variant: 'destructive',
        action: {
          label: tRef.current('common.tryAgain'),
          onClick: () => {
            void refreshExpenses();
          },
        },
      });
    }
  }, []);

  const refreshIncomes = useCallback(async () => {
    try {
      const incomesData = await dataService.getIncomes();
      setIncomes(incomesData);
    } catch (error) {
      Sentry.captureException(error, { tags: { context: 'refreshIncomes' } });
      console.error('Failed to refresh incomes:', error);
      toastRef.current({
        title: tRef.current('common.error'),
        description: tRef.current('common.refreshFailed'),
        variant: 'destructive',
        action: {
          label: tRef.current('common.tryAgain'),
          onClick: () => {
            void refreshIncomes();
          },
        },
      });
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
      toastRef.current({
        title: tRef.current('common.error'),
        description: tRef.current('common.refreshFailed'),
        variant: 'destructive',
        action: {
          label: tRef.current('common.tryAgain'),
          onClick: () => {
            void refreshAccounts();
          },
        },
      });
    }
  }, []);

  const refreshDebts = useCallback(async () => {
    try {
      const debtsData = await dataService.getDebts();
      setDebts(debtsData);
    } catch (error) {
      Sentry.captureException(error, { tags: { context: 'refreshDebts' } });
      console.error('Failed to refresh debts:', error);
      toastRef.current({
        title: tRef.current('common.error'),
        description: tRef.current('common.refreshFailed'),
        variant: 'destructive',
        action: {
          label: tRef.current('common.tryAgain'),
          onClick: () => {
            void refreshDebts();
          },
        },
      });
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    const userId = session?.user?.id;
    if (userId && bootedUserIdRef.current !== userId) {
      bootedUserIdRef.current = userId;
      hydrateFromSnapshot(userId);
      fetchData();

      return;
    }

    if (!session) {
      bootedUserIdRef.current = null;
      stage2DoneForUserRef.current = null;
      hydratedFromCacheRef.current = false;
      setIsHistoryLoaded(false);
      // Never leave financial data behind on a shared device after sign-out.
      clearDataSnapshot();
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
      // Reminder hour and notification prefs are per-user too — clearing them
      // stops a second account on a shared device briefly seeing user A's
      // settings before the new fetch resolves.
      setDailyReminderHour(null);
      setNotificationPreferences({});
      setIsInitialized(false);
      setIsSecondaryLoaded(false);
    }
  }, [isAuthLoading, session, fetchData, hydrateFromSnapshot]);

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

  // Persist a snapshot of the current data so the next app open paints
  // instantly from cache while the network fetch runs. Debounced because
  // fetch stages and optimistic mutations arrive in bursts; flushed
  // immediately on backgrounding so a quick "add expense, close app"
  // sequence isn't lost to the debounce window.
  const userId = session?.user?.id;
  // Holds the latest "save current state" closure. The flush-on-hide listener
  // reads it instead of closing over data, so that listener is registered once
  // for the session rather than torn down and re-added on every mutation.
  const persistSnapshotRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isInitialized || !userId) {
      persistSnapshotRef.current = null;

      return;
    }

    const persist = () => {
      saveDataSnapshot(userId, {
        categories,
        expenses,
        incomes,
        recurringExpenses,
        recurringIncomes,
        tags,
        templates,
        categoryBudgets,
        accounts,
        goals,
        accountBalances,
        debts,
        monthlyBudget,
        defaultCurrency,
        defaultSavingsPct,
        dailyReminderHour,
        notificationPreferences,
        secondaryLoaded: isSecondaryLoaded,
      });
    };
    persistSnapshotRef.current = persist;

    const timer = setTimeout(persist, 2000);

    return () => clearTimeout(timer);
  }, [
    isInitialized,
    userId,
    categories,
    expenses,
    incomes,
    recurringExpenses,
    recurringIncomes,
    tags,
    templates,
    categoryBudgets,
    accounts,
    goals,
    accountBalances,
    debts,
    monthlyBudget,
    defaultCurrency,
    defaultSavingsPct,
    dailyReminderHour,
    notificationPreferences,
    isSecondaryLoaded,
  ]);

  // Flush the pending snapshot synchronously when the app is backgrounded, so
  // data changed within the debounce window isn't lost if the OS freezes or
  // discards the page (common on iOS PWA). Registered once for the lifetime
  // of the provider — it reads the latest persist closure from the ref.
  useEffect(() => {
    const flushOnHide = () => {
      if (document.visibilityState === 'hidden') {
        persistSnapshotRef.current?.();
      }
    };

    document.addEventListener('visibilitychange', flushOnHide);

    return () => {
      document.removeEventListener('visibilitychange', flushOnHide);
    };
  }, []);

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
      setNotificationPreferences,
    }),
    [refreshData, refreshExpenses, refreshIncomes, refreshAccounts, refreshDebts],
  );

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
                            {children}
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
