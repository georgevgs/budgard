import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  useExpensesData,
  useCategoriesData,
} from '@/contexts/DataContext';
import { buildWeeklyRecap, type WeeklyRecap } from '@/lib/weeklyAnomalies';

const STORAGE_KEY = 'budgard_weekly_recap_dismissed';

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

const writeDismissed = (windowEnd: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, windowEnd);
  } catch {
    // localStorage may be unavailable
  }
  listeners.forEach((l) => l());
};

export type UseWeeklyRecapResult = {
  recap: WeeklyRecap | null;
  isDismissed: boolean;
  dismiss: () => void;
};

// Recap surfaces only on Mondays so the user reflects on the week that just
// finished. Off-Monday days return null without computing the recap.
const MONDAY = 1;

export const useWeeklyRecap = (): UseWeeklyRecapResult => {
  const expenses = useExpensesData();
  const { expenseCategories } = useCategoriesData();

  const recap = useMemo<WeeklyRecap | null>(() => {
    const now = new Date();
    if (now.getDay() !== MONDAY) return null;

    return buildWeeklyRecap({
      now,
      expenses,
      categories: expenseCategories,
    });
  }, [expenses, expenseCategories]);

  const dismissedValue = useSyncExternalStore(
    subscribeDismissed,
    readDismissed,
    readDismissed,
  );

  const isDismissed = useMemo(() => {
    if (!recap) return false;
    if (!dismissedValue) return false;

    return dismissedValue >= recap.windowStart;
  }, [dismissedValue, recap]);

  const dismiss = useCallback(() => {
    if (!recap) return;
    writeDismissed(recap.windowEnd);
  }, [recap]);

  return { recap, isDismissed, dismiss };
};
