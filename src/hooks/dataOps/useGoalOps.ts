import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { Goal } from '@/types/Goal';
import {
  patchOptimistic,
  prependOptimistic,
  removeOptimistic,
  replaceById,
} from '@/hooks/dataOps/helpers';
import { useMutationRunner } from '@/hooks/dataOps/useMutationRunner';

export const useGoalOps = () => {
  const { isInitialized } = useDataConfig();
  const { setGoals } = useDataActions();
  const { t } = useTranslation();
  const runMutation = useMutationRunner();

  return useMemo(() => {
    const skip = !isInitialized;

    const handleGoalCreate = (goalData: Partial<Goal>) => {
      const optimistic = buildOptimisticGoal(goalData);

      return runMutation({
        operation: 'createGoal',
        skip,
        errorMessage: t('goals.toasts.createFailed'),
        successMessage: t('goals.toasts.created'),
        optimistic: () => prependOptimistic(setGoals, optimistic),
        perform: () => dataService.createGoal(goalData),
        commit: (saved) =>
          setGoals((prev) => replaceById(prev, optimistic.id, saved)),
      });
    };

    const handleGoalUpdate = (goalId: string, goalData: Partial<Goal>) =>
      runMutation({
        operation: 'updateGoal',
        skip,
        errorMessage: t('goals.toasts.updateFailed'),
        optimistic: () => patchOptimistic(setGoals, goalId, goalData),
        perform: () => dataService.updateGoal(goalId, goalData),
        commit: (saved) => setGoals((prev) => replaceById(prev, goalId, saved)),
      });

    const handleGoalDelete = (goalId: string) =>
      runMutation({
        operation: 'deleteGoal',
        skip,
        errorMessage: t('goals.toasts.deleteFailed'),
        onStart: () => haptics.warning(),
        optimistic: () => removeOptimistic(setGoals, goalId),
        perform: () => dataService.deleteGoal(goalId),
      });

    return { handleGoalCreate, handleGoalUpdate, handleGoalDelete };
  }, [isInitialized, setGoals, runMutation, t]);
};

// --- Helpers ---

const buildOptimisticGoal = (goalData: Partial<Goal>): Goal =>
  ({
    ...goalData,
    id: `temp-${Date.now()}`,
    is_completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }) as Goal;
