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

interface DataState {
  categories: Category[];
  expenses: Expense[];
  recurringExpenses: RecurringExpense[];
  tags: Tag[];
  monthlyBudget: number | null;
  isLoading: boolean;
  isInitialized: boolean;
}

interface DataContextType extends DataState {
  refreshData: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
  setCategories: Dispatch<SetStateAction<Category[]>>;
  setExpenses: Dispatch<SetStateAction<Expense[]>>;
  setRecurringExpenses: Dispatch<SetStateAction<RecurringExpense[]>>;
  setTags: Dispatch<SetStateAction<Tag[]>>;
  setMonthlyBudget: Dispatch<SetStateAction<number | null>>;
}

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

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) {
      return;
    }

    setIsLoading(true);

    try {
      // Parallel fetch for better performance
      const [categoriesData, expensesData, recurringExpensesData, budgetData, tagsData] =
        await Promise.all([
          dataService.getCategories(),
          dataService.getExpenses(),
          dataService.getRecurringExpenses(),
          dataService.getBudget(),
          dataService.getTags(),
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
      setCategories([]);
      setExpenses([]);
      setRecurringExpenses([]);
      setTags([]);
      setMonthlyBudget(null);
      setIsInitialized(false);
      setIsLoading(false);
    }
  }, [isAuthLoading, session, isInitialized, fetchData]);

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

export function useData() {
  const context = useContext(DataContext);

  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }

  return context;
}
