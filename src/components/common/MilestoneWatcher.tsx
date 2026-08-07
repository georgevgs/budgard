import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGoalsData,
  useDebtsData,
  useDataConfig,
  useExpensesData,
} from '@/contexts/DataContext';
import { useAllGoalProgress } from '@/hooks/useGoalProgress';
import { useSavingsRhythm } from '@/hooks/today/useSavingsRhythm';
import { useCompletionCelebration } from '@/hooks/useCompletionCelebration';
import { useIsPro } from '@/hooks/useIsPro';
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
  const isPro = useIsPro();
  const goals = useGoalsData();
  const debts = useDebtsData();
  const goalProgress = useAllGoalProgress();
  const rhythm = useSavingsRhythm(useExpensesData());

  // Only arm once the full dataset has loaded — the two-stage fetch and cache
  // hydration would otherwise look like fresh completions.
  const armed = isInitialized && isSecondaryLoaded;

  const completedGoalIds = Object.values(goalProgress)
    .filter((p) => p.percent >= 1)
    .map((p) => p.goalId);

  const clearedDebtIds = debts
    .filter((d) => d.is_completed && !d.is_archived)
    .map((d) => d.id);

  // One id per month, so beating last month's savings celebrates once and
  // cannot re-fire if the figure dips back under and recovers.
  const beatenMonthIds = buildBeatenMonthIds(rhythm);

  const celebrateSavings = useCallback(() => {
    celebrate();
    haptics.success();
    toast({
      variant: 'success',
      title: t('today.rhythm.celebrate'),
      duration: 6000,
    });
  }, [t]);

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

  // Savings goals are a Pro feature — free users can't open /goals, so they
  // get no goal celebrations either. Debt tracking stays free for everyone.
  useCompletionCelebration(completedGoalIds, armed && isPro, celebrateGoal);
  useCompletionCelebration(clearedDebtIds, armed, celebrateDebt);
  useCompletionCelebration(beatenMonthIds, armed, celebrateSavings);

  return null;
};

export default MilestoneWatcher;

// --- Helpers ---

const buildBeatenMonthIds = (
  rhythm: ReturnType<typeof useSavingsRhythm>,
): string[] => {
  if (!rhythm) {
    return [];
  }
  if (rhythm.remainingToTarget !== 0) {
    return [];
  }

  return [`saved-beat-${new Date().toISOString().slice(0, 7)}`];
};
