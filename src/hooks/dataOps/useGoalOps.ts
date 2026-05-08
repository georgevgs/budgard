import { useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import { useToast } from '@/hooks/useToast';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { Goal } from '@/types/Goal';
import { patchById, replaceById } from './helpers';
import { useShowErrorToast } from './useShowErrorToast';

export const useGoalOps = () => {
  const { isInitialized } = useDataConfig();
  const { setGoals } = useDataActions();
  const { toast } = useToast();
  const showErrorToast = useShowErrorToast();

  const handleGoalCreate = useCallback(
    async (goalData: Partial<Goal>) => {
      if (!isInitialized) return;

      const optimisticGoal = {
        ...goalData,
        id: `temp-${Date.now()}`,
        is_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Goal;

      setGoals((prev) => [optimisticGoal, ...prev]);

      try {
        const saved = await dataService.createGoal(goalData);
        haptics.success();
        setGoals((prev) => replaceById(prev, optimisticGoal.id, saved));
        toast({ variant: 'success', title: 'Goal created' });
      } catch (error) {
        haptics.error();
        setGoals((prev) => prev.filter((g) => g.id !== optimisticGoal.id));
        Sentry.captureException(error, { tags: { operation: 'createGoal' } });
        showErrorToast('Failed to create goal');
        throw error;
      }
    },
    [isInitialized, setGoals, showErrorToast, toast],
  );

  const handleGoalUpdate = useCallback(
    async (goalId: string, goalData: Partial<Goal>) => {
      if (!isInitialized) return;

      let previousGoals: Goal[] = [];
      setGoals((prev) => {
        previousGoals = prev;

        return patchById(prev, goalId, goalData);
      });

      try {
        const saved = await dataService.updateGoal(goalId, goalData);
        haptics.success();
        setGoals((prev) => replaceById(prev, goalId, saved));
      } catch (error) {
        haptics.error();
        setGoals(previousGoals);
        Sentry.captureException(error, { tags: { operation: 'updateGoal' } });
        showErrorToast('Failed to update goal');
        throw error;
      }
    },
    [isInitialized, setGoals, showErrorToast],
  );

  const handleGoalDelete = useCallback(
    async (goalId: string) => {
      if (!isInitialized) return;

      haptics.warning();
      let previousGoals: Goal[] = [];
      setGoals((prev) => {
        previousGoals = prev;

        return prev.filter((g) => g.id !== goalId);
      });

      try {
        await dataService.deleteGoal(goalId);
        haptics.success();
      } catch (error) {
        haptics.error();
        setGoals(previousGoals);
        Sentry.captureException(error, { tags: { operation: 'deleteGoal' } });
        showErrorToast('Failed to delete goal');
        throw error;
      }
    },
    [isInitialized, setGoals, showErrorToast],
  );

  return useMemo(
    () => ({ handleGoalCreate, handleGoalUpdate, handleGoalDelete }),
    [handleGoalCreate, handleGoalUpdate, handleGoalDelete],
  );
};
