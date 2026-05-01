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
  monthlyBudget: number | null;
  defaultCurrency: string;
  defaultSavingsPct: number | null;
  isLoading: boolean;
  isInitialized: boolean;
};

type DataContextType = DataState & {
  refreshData: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
  refreshIncomes: () => Promise<void>;
  setCategories: Dispatch<SetStateAction<Category[]>>;
  setExpenses: Dispatch<SetStateAction<Expense[]>>;
  setIncomes: Dispatch<SetStateAction<Expense[]>>;
  setRecurringExpenses: Dispatch<SetStateAction<RecurringExpense[]>>;
  setRecurringIncomes: Dispatch<SetStateAction<RecurringExpense[]>>;
  setTags: Dispatch<SetStateAction<Tag[]>>;
  setTemplates: Dispatch<SetStateAction<ExpenseTemplate[]>>;
  setMonthlyBudget: Dispatch<SetStateAction<number | null>>;
  setDefaultCurrency: Dispatch<SetStateAction<string>>;
  setDefaultSavingsPct: Dispatch<SetStateAction<number | null>>;
};

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
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
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState<string>('EUR');
  const [defaultSavingsPct, setDefaultSavingsPct] = useState<number | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

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

    setIsLoading(true);

    try {
      // Parallel fetch for better performance
      const [
        categoriesData,
        expensesData,
        incomesData,
        recurringExpensesData,
        recurringIncomesData,
        budgetData,
        tagsData,
        templatesData,
      ] = await Promise.all([
        dataService.getCategories(controller.signal),
        dataService.getExpenses(controller.signal),
        dataService.getIncomes(controller.signal),
        dataService.getRecurringExpenses(controller.signal),
        dataService.getRecurringIncomes(controller.signal),
        dataService.getBudget(controller.signal),
        dataService.getTags(controller.signal),
        dataService.getTemplates(controller.signal),
      ]);

      // React 18+ automatically batches these state updates
      setCategories(categoriesData);
      setExpenses(expensesData);
      setIncomes(incomesData);
      setRecurringExpenses(recurringExpensesData);
      setRecurringIncomes(recurringIncomesData);
      setTags(tagsData);
      setTemplates(templatesData);
      setMonthlyBudget(budgetData?.monthly_amount ?? null);
      setDefaultCurrency(budgetData?.default_currency ?? 'EUR');
      setDefaultSavingsPct(budgetData?.default_savings_pct ?? null);
      setIsInitialized(true);
      setIsLoading(false);
      lastFetchAtRef.current = Date.now();
      wasAbortedRef.current = false;
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
      setMonthlyBudget(null);
      setDefaultCurrency('EUR');
      setDefaultSavingsPct(null);
      setIsInitialized(false);
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
      monthlyBudget,
      defaultCurrency,
      defaultSavingsPct,
      isLoading,
      isInitialized,
      refreshData,
      refreshExpenses,
      refreshIncomes,
      setCategories,
      setExpenses,
      setIncomes,
      setRecurringExpenses,
      setRecurringIncomes,
      setTags,
      setTemplates,
      setMonthlyBudget,
      setDefaultCurrency,
      setDefaultSavingsPct,
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
      monthlyBudget,
      defaultCurrency,
      defaultSavingsPct,
      isLoading,
      isInitialized,
      refreshData,
      refreshExpenses,
      refreshIncomes,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function isAbortError(error: unknown): boolean {
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
}

export function useData() {
  const context = useContext(DataContext);

  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }

  return context;
}
