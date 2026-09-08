import { useState, useEffect, useMemo, useReducer, useRef } from 'react';
import { useAuth } from '@/common/contexts/AuthContext';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';
import {
  dataReducer,
  EMPTY_DATA,
  createSetters,
} from '@/common/hooks/data/dataReducer';
import { useDataLifecycle } from '@/common/hooks/data/useDataLifecycle';
import { useDataSnapshot } from '@/common/hooks/data/useDataSnapshot';
import { useDataSlices } from '@/common/hooks/data/useDataSlices';
import type { DataActions } from '@/common/contexts/DataContext.types';
import { loadDataSnapshot } from '@/constants/dataCache';

export const useDataLayer = () => {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { activeOwnerId } = useFinancialSpace();
  const spaceKey = buildSpaceCacheKey(session?.user.id ?? null, activeOwnerId);
  const [data, dispatch] = useReducer(dataReducer, EMPTY_DATA);
  const [bootedSpaceKey, setBootedSpaceKey] = useState<string | null>(null);
  const setters = useMemo(() => createSetters(dispatch), []);
  const expensesRef = useRef(data.expenses);
  const incomesRef = useRef(data.incomes);
  const refreshers = useDataLifecycle(
    activeOwnerId,
    spaceKey,
    isAuthLoading,
    setters,
    dispatch,
  );
  useDataSnapshot(data, spaceKey);
  const slices = useDataSlices(data);

  useEffect(() => {
    // Only committed values reach optimistic mutation callbacks.
    expensesRef.current = data.expenses;
    incomesRef.current = data.incomes;
  }, [data.expenses, data.incomes]);

  // Adjust during render so a new identity never paints the previous space's
  // data. Fetches and cache deletion belong to the lifecycle effect.
  if (!isAuthLoading && bootedSpaceKey !== spaceKey) {
    setBootedSpaceKey(spaceKey);
    dispatch({ type: 'reset' });
    if (spaceKey) {
      const snapshot = loadDataSnapshot(spaceKey);
      if (snapshot) {
        dispatch({ type: 'hydrate', snapshot });
      }
    }
  }

  const actions = useMemo<DataActions>(
    () => ({
      ...refreshers,
      ...setters,
      expensesRef,
      incomesRef,
    }),
    [refreshers, setters],
  );

  return {
    actions,
    ...slices,
    expenses: data.expenses,
    incomes: data.incomes,
    tags: data.tags,
    templates: data.templates,
    goals: data.goals,
    debts: data.debts,
    categoryBudgets: data.categoryBudgets,
    noSpendDays: data.noSpendDays,
  };
};

const buildSpaceCacheKey = (
  userId: string | null,
  ownerId: string,
): string | null => {
  if (!userId || !ownerId) {
    return null;
  }

  return `${userId}:${ownerId}`;
};
