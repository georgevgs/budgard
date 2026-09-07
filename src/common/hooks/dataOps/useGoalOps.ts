import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataActions, useDataConfig } from '@/common/contexts/DataContext';
import { dataService } from '@/common/api/dataService';
import { haptics } from '@/constants/haptics';
import type { Goal } from '@/types/Goal';
import {
  patchOptimistic,
  prependOptimistic,
  removeOptimistic,
  replaceById,
} from '@/common/hooks/dataOps/helpers';
import { useMutationRunner } from '@/common/hooks/dataOps/useMutationRunner';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';

export const useGoalOps = () => {
  const { activeOwnerId } = useFinancialSpace();
  const { isInitialized } = useDataConfig();
  const { setGoals } = useDataActions();
  const { t } = useTranslation();
  const runMutation = useMutationRunner();

  return useMemo(() => {
    const shouldSkip = !isInitialized;

    const handleGoalCreate = (goalData: Partial<Goal>) => {
      const optimistic = buildOptimisticGoal(goalData);

      return runMutation({
        operation: 'createGoal',
        shouldSkip,
        errorMessage: t('goals.toasts.createFailed'),
        successMessage: t('goals.toasts.created'),
        optimistic: () => prependOptimistic(setGoals, optimistic),
        perform: () => dataService.createGoal(goalData, activeOwnerId),
        commit: (saved) =>
          setGoals((prev) => replaceById(prev, optimistic.id, saved)),
      });
    };

    const handleGoalUpdate = (goalId: string, goalData: Partial<Goal>) =>
      runMutation({
        operation: 'updateGoal',
        shouldSkip,
        errorMessage: t('goals.toasts.updateFailed'),
        optimistic: () => patchOptimistic(setGoals, goalId, goalData),
        perform: () => dataService.updateGoal(goalId, goalData),
        commit: (saved) => setGoals((prev) => replaceById(prev, goalId, saved)),
      });

    const handleGoalDelete = (goalId: string) =>
      runMutation({
        operation: 'deleteGoal',
        shouldSkip,
        errorMessage: t('goals.toasts.deleteFailed'),
        onStart: () => haptics.warning(),
        optimistic: () => removeOptimistic(setGoals, goalId),
        perform: () => dataService.deleteGoal(goalId),
      });

    return { handleGoalCreate, handleGoalUpdate, handleGoalDelete };
  }, [activeOwnerId, isInitialized, setGoals, runMutation, t]);
};

const buildOptimisticGoal = (goalData: Partial<Goal>): Goal =>
  ({
    ...goalData,
    id: `temp-${Date.now()}`,
    is_completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }) as Goal;
