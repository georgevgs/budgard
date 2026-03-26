import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

const BUDGET_WARNING_THRESHOLD = 80;
const BUDGET_EXCEEDED_THRESHOLD = 100;

type UseBudgetAlertsProps = {
  monthlyBudget: number | null;
  monthlySpent: number;
};

export const useBudgetAlerts = ({
  monthlyBudget,
  monthlySpent,
}: UseBudgetAlertsProps): void => {
  const { t } = useTranslation();
  const shownWarning = useRef(false);
  const shownExceeded = useRef(false);
  const prevSpent = useRef(monthlySpent);

  // Reset alerts when budget changes or at the start of a new session
  useEffect(() => {
    shownWarning.current = false;
    shownExceeded.current = false;
  }, [monthlyBudget]);

  useEffect(() => {
    if (!monthlyBudget || monthlyBudget === 0) return;

    const percentage = (monthlySpent / monthlyBudget) * 100;
    const prevPercentage = (prevSpent.current / monthlyBudget) * 100;
    prevSpent.current = monthlySpent;

    // Only alert when spending increases (not on page load or deletions)
    if (monthlySpent <= 0) return;

    // Exceeded 100%
    if (
      percentage >= BUDGET_EXCEEDED_THRESHOLD &&
      prevPercentage < BUDGET_EXCEEDED_THRESHOLD &&
      !shownExceeded.current
    ) {
      shownExceeded.current = true;
      haptics.warning();
      toast({
        variant: 'destructive',
        title: t('budget.alerts.exceeded'),
        description: t('budget.alerts.exceededDescription', {
          spent: formatCurrency(monthlySpent),
          budget: formatCurrency(monthlyBudget),
        }),
      });

      return;
    }

    // Warning at 80%
    if (
      percentage >= BUDGET_WARNING_THRESHOLD &&
      prevPercentage < BUDGET_WARNING_THRESHOLD &&
      !shownWarning.current
    ) {
      shownWarning.current = true;
      haptics.warning();
      const remaining = monthlyBudget - monthlySpent;
      toast({
        title: t('budget.alerts.warning'),
        description: t('budget.alerts.warningDescription', {
          percent: Math.round(percentage),
          remaining: formatCurrency(remaining),
        }),
      });
    }
  }, [monthlySpent, monthlyBudget, t]);
};
