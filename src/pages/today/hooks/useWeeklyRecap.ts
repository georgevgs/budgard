import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  useExpensesData,
  useCategoriesData,
} from '@/common/contexts/DataContext';
import { useAuth } from '@/common/contexts/AuthContext';
import {
  buildWeeklyRecap,
  type WeeklyRecap,
} from '@/constants/weeklyAnomalies';

const STORAGE_KEY = 'budgard_weekly_recap_dismissed';

type Listener = () => void;
const listeners = new Set<Listener>();

const subscribeDismissed = (cb: Listener): (() => void) => {
  listeners.add(cb);

  return () => {
    listeners.delete(cb);
  };
};

export const readWeeklyRecapDismissal = (userId: string): string => {
  try {
    return localStorage.getItem(scopedKey(userId)) ?? '';
  } catch {
    return '';
  }
};

export const writeWeeklyRecapDismissal = (
  userId: string,
  windowEnd: string,
): void => {
  try {
    localStorage.setItem(scopedKey(userId), windowEnd);
  } catch {
    // localStorage may be unavailable
  }
  listeners.forEach((l) => l());
};

export type UseWeeklyRecapReturn = {
  recap: WeeklyRecap | null;
  isDismissed: boolean;
  dismiss: () => void;
};

// Recap surfaces only on Mondays so the user reflects on the week that just
// finished. Off-Monday days return null without computing the recap.
const MONDAY = 1;

export const useWeeklyRecap = (): UseWeeklyRecapReturn => {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const expenses = useExpensesData();
  const { expenseCategories } = useCategoriesData();

  const recap = useMemo<WeeklyRecap | null>(() => {
    const now = new Date();
    if (now.getDay() !== MONDAY) {
      return null;
    }

    return buildWeeklyRecap({
      now,
      expenses,
      categories: expenseCategories,
    });
  }, [expenses, expenseCategories]);

  const readDismissal = useCallback(
    () => readWeeklyRecapDismissal(userId),
    [userId],
  );
  const dismissedValue = useSyncExternalStore(
    subscribeDismissed,
    readDismissal,
    readDismissal,
  );

  const isDismissed = useMemo(() => {
    if (!recap) {
      return false;
    }
    if (!dismissedValue) {
      return false;
    }

    return dismissedValue >= recap.windowStart;
  }, [dismissedValue, recap]);

  const dismiss = useCallback(() => {
    if (!recap) {
      return;
    }
    writeWeeklyRecapDismissal(userId, recap.windowEnd);
  }, [recap, userId]);

  return { recap, isDismissed, dismiss };
};

const scopedKey = (userId: string): string => `${STORAGE_KEY}:${userId}`;
