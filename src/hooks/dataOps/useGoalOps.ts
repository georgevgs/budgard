import { useCallback, useMemo } from 'react';
import * as Sentry from '@/lib/sentry';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/useToast';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { Goal } from '@/types/Goal';
import { patchById, replaceById } from '@/hooks/dataOps/helpers';
import { useShowErrorToast } from '@/hooks/dataOps/useShowErrorToast';

export const useGoalOps = () => {
  const { isInitialized } = useDataConfig();
  const { setGoals } = useDataActions();
  const { toast } = useToast();
  const { t } = useTranslation();
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
        toast({ variant: 'success', title: t('goals.toasts.created') });
      } catch (error) {
        haptics.error();
        setGoals((prev) => prev.filter((g) => g.id !== optimisticGoal.id));
        Sentry.captureException(error, { tags: { operation: 'createGoal' } });
        showErrorToast(t('goals.toasts.createFailed'));
        throw error;
      }
    },
    [isInitialized, setGoals, showErrorToast, toast, t],
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
        showErrorToast(t('goals.toasts.updateFailed'));
        throw error;
      }
    },
    [isInitialized, setGoals, showErrorToast, t],
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
        showErrorToast(t('goals.toasts.deleteFailed'));
        throw error;
      }
    },
    [isInitialized, setGoals, showErrorToast, t],
  );

  return useMemo(
    () => ({ handleGoalCreate, handleGoalUpdate, handleGoalDelete }),
    [handleGoalCreate, handleGoalUpdate, handleGoalDelete],
  );
};
