import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { format, subDays } from 'date-fns';
import {
  useExpensesData,
  useCategoriesData,
} from '@/contexts/DataContext';
import { buildDailyRecap, type DailyRecap } from '@/lib/dailyRecap';

const STORAGE_KEY = 'budgard_recap_dismissed';

type Listener = () => void;
const listeners = new Set<Listener>();

const subscribeDismissed = (cb: Listener): (() => void) => {
  listeners.add(cb);

  return () => {
    listeners.delete(cb);
  };
};

const readDismissed = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
};

const writeDismissed = (todayStr: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, todayStr);
  } catch {
    // localStorage may be unavailable
  }
  listeners.forEach((l) => l());
};

export type UseDailyRecapResult = {
  recap: DailyRecap | null;
  isDismissed: boolean;
  dismiss: () => void;
};

export const useDailyRecap = (): UseDailyRecapResult => {
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const yesterday = useMemo(
    () => format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    [],
  );

  const dismissedValue = useSyncExternalStore(
    subscribeDismissed,
    readDismissed,
    readDismissed,
  );
  const isDismissed = dismissedValue === today;

  const expenses = useExpensesData();
  const { expenseCategories } = useCategoriesData();

  const recap = useMemo<DailyRecap | null>(
    () =>
      buildDailyRecap({
        yesterday,
        expenses,
        categories: expenseCategories,
      }),
    [yesterday, expenses, expenseCategories],
  );

  const dismiss = useCallback(() => {
    writeDismissed(today);
  }, [today]);

  return { recap, isDismissed, dismiss };
};
