import { useCallback } from 'react';
import { currentMonthKey } from '@/lib/dates';
import { useTranslation } from 'react-i18next';
import {
  useGoalsData,
  useDebtsData,
  useDataConfig,
  useExpensesData,
} from '@/contexts/DataContext';
import { useAllGoalProgress } from '@/hooks/useGoalProgress';
import { useSavingsRhythm } from '@/hooks/savings/useSavingsRhythm';
import { useCompletionCelebration } from '@/hooks/useCompletionCelebration';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { celebrate } from '@/lib/confetti';
import { haptics } from '@/lib/haptics';
import { toast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/utils';

// Watches for milestones across the whole app — mounted in the authenticated
// layout so it fires no matter which screen the user is on (a category goal can
// complete while adding an expense; a debt clears from a payment). Renders
// nothing.
const MilestoneWatcher = () => {
  const { t } = useTranslation();
  const { isInitialized, isSecondaryLoaded, defaultCurrency } = useDataConfig();
  const { isPro } = useSubscription();
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

  // Celebrates only real money reaching a round figure — never a score.
  const crossedMilestoneIds = buildCrossedMilestoneIds(rhythm);

  const celebrateSetAside = useCallback(
    (id: string) => {
      celebrate();
      haptics.success();
      toast({
        variant: 'success',
        // The rung is the trailing segment of the id. It is a bare number, so
        // it has to be formatted before it reaches the user — "100 set aside"
        // reads as a score, "€100 set aside" reads as money.
        title: t('today.rhythm.celebrate', {
          amount: formatCurrency(Number(id.split('-').pop()), defaultCurrency),
        }),
        duration: 6000,
      });
    },
    [t, defaultCurrency],
  );

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
  useCompletionCelebration(crossedMilestoneIds, armed, celebrateSetAside);

  return null;
};

export default MilestoneWatcher;

// --- Helpers ---

// One id per milestone crossed, month-scoped so a fresh month can celebrate
// the same rungs again. Crossing several at once (a large transfer) fires once
// per rung, which is correct: each was a real threshold passed.
const buildCrossedMilestoneIds = (
  rhythm: ReturnType<typeof useSavingsRhythm>,
): string[] => {
  if (!rhythm) {
    return [];
  }

  const month = currentMonthKey();
  const ids: string[] = [];
  for (const rung of [25, 50, 100, 150, 200, 250, 500, 1000]) {
    if (rhythm.setAside >= rung) {
      ids.push(`set-aside-${month}-${rung}`);
    }
  }

  return ids;
};
