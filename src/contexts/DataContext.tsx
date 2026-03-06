import {
  createContext,
  useContext,
  useState,
  useEffect,
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
import { useToast } from '@/hooks/useToast';

type DataState = {
  categories: Category[];
  expenses: Expense[];
  recurringExpenses: RecurringExpense[];
  tags: Tag[];
  monthlyBudget: number | null;
  isLoading: boolean;
  isInitialized: boolean;
};

type DataContextType = DataState & {
  refreshData: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
  setCategories: Dispatch<SetStateAction<Category[]>>;
  setExpenses: Dispatch<SetStateAction<Expense[]>>;
  setRecurringExpenses: Dispatch<SetStateAction<RecurringExpense[]>>;
  setTags: Dispatch<SetStateAction<Tag[]>>;
  setMonthlyBudget: Dispatch<SetStateAction<number | null>>;
};

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<
    RecurringExpense[]
  >([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  // Tracks the AbortController for the current in-flight fetchData call so we
  // can cancel proactively when the app is backgrounded on iOS.
  const abortControllerRef = useRef<AbortController | null>(null);

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
        recurringExpensesData,
        budgetData,
        tagsData,
      ] = await Promise.all([
        dataService.getCategories(controller.signal),
        dataService.getExpenses(controller.signal),
        dataService.getRecurringExpenses(controller.signal),
        dataService.getBudget(controller.signal),
        dataService.getTags(controller.signal),
      ]);

      // React 18+ automatically batches these state updates
      setCategories(categoriesData);
      setExpenses(expensesData);
      setRecurringExpenses(recurringExpensesData);
      setTags(tagsData);
      setMonthlyBudget(budgetData?.monthly_amount ?? null);
      setIsInitialized(true);
      setIsLoading(false);
    } catch (error) {
      // iOS PWA aborts in-flight requests when the app is backgrounded. The
      // AbortError may be a raw DOMException or wrapped by Supabase into an
      // object with { message: "AbortError: ..." }. Silently ignore both —
      // the visibilitychange listener retries when the app comes to foreground.
      if (isAbortError(error)) {
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
      setRecurringExpenses([]);
      setTags([]);
      setMonthlyBudget(null);
      setIsInitialized(false);
      setIsLoading(false);
    }
  }, [isAuthLoading, session, isInitialized, fetchData]);

  // Page Visibility API: proactively abort on background, retry on foreground.
  // On iOS PWA the OS aborts network requests mid-flight when the app is
  // backgrounded. By owning the abort ourselves we get a clean, intentional
  // cancellation before the OS does it uncontrollably, and we retry as soon
  // as the user brings the app back.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        abortControllerRef.current?.abort();
        return;
      }

      if (session?.user?.id && !isInitialized) {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.user?.id, isInitialized, fetchData]);

  const value = {
    categories,
    expenses,
    recurringExpenses,
    tags,
    monthlyBudget,
    isLoading,
    isInitialized,
    refreshData,
    refreshExpenses,
    setCategories,
    setExpenses,
    setRecurringExpenses,
    setTags,
    setMonthlyBudget,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.message.includes('AbortError')) return true;
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
