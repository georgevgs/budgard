import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGoalsData,
  useDebtsData,
  useDataConfig,
} from '@/contexts/DataContext';
import { useAllGoalProgress } from '@/hooks/useGoalProgress';
import { useCompletionCelebration } from '@/hooks/useCompletionCelebration';
import { celebrate } from '@/lib/confetti';
import { haptics } from '@/lib/haptics';
import { toast } from '@/hooks/useToast';

// Watches for milestones across the whole app — mounted in the authenticated
// layout so it fires no matter which screen the user is on (a category goal can
// complete while adding an expense; a debt clears from a payment). Renders
// nothing.
const MilestoneWatcher = () => {
  const { t } = useTranslation();
  const { isInitialized, isSecondaryLoaded } = useDataConfig();
  const goals = useGoalsData();
  const debts = useDebtsData();
  const goalProgress = useAllGoalProgress();

  // Only arm once the full dataset has loaded — the two-stage fetch and cache
  // hydration would otherwise look like fresh completions.
  const armed = isInitialized && isSecondaryLoaded;

  const completedGoalIds = Object.values(goalProgress)
    .filter((p) => p.percent >= 1)
    .map((p) => p.goalId);

  const clearedDebtIds = debts
    .filter((d) => d.is_completed && !d.is_archived)
    .map((d) => d.id);

  const celebrateGoal = useCallback(
    (id: string) => {
      const goal = goals.find((g) => g.id === id);
      if (!goal) return;

      celebrate();
      haptics.success();
      toast({
        variant: 'success',
        title: t('goals.celebrate', { name: goal.name }),
        duration: 6000,
      });
    },
    [goals, t],
  );

  const celebrateDebt = useCallback(
    (id: string) => {
      const debt = debts.find((d) => d.id === id);
      if (!debt) return;

      celebrate();
      haptics.success();
      toast({
        variant: 'success',
        title: t('debts.celebrate', { name: debt.name }),
        duration: 6000,
      });
    },
    [debts, t],
  );

  useCompletionCelebration(completedGoalIds, armed, celebrateGoal);
  useCompletionCelebration(clearedDebtIds, armed, celebrateDebt);

  return null;
};

export default MilestoneWatcher;
