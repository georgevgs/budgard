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
  defaultCurrency: string;
};

export const useBudgetAlerts = ({
  monthlyBudget,
  monthlySpent,
  defaultCurrency,
}: UseBudgetAlertsProps): void => {
  const { t } = useTranslation();
  const shownWarning = useRef(false);
  const shownExceeded = useRef(false);
  // Start as null to distinguish "haven't seen real data yet" from "0 spent"
  const prevSpent = useRef<number | null>(null);

  // Reset when budget amount changes
  useEffect(() => {
    shownWarning.current = false;
    shownExceeded.current = false;
    prevSpent.current = null;
  }, [monthlyBudget]);

  useEffect(() => {
    if (!monthlyBudget || monthlyBudget === 0) return;
    if (monthlySpent <= 0) return;

    // First time we see real spending data — record it but don't alert.
    // This prevents toasts on page load / reload.
    if (prevSpent.current === null) {
      prevSpent.current = monthlySpent;

      return;
    }

    const percentage = (monthlySpent / monthlyBudget) * 100;
    const prevPercentage = (prevSpent.current / monthlyBudget) * 100;
    prevSpent.current = monthlySpent;

    // Only alert when spending crosses a threshold upward
    // (not on deletions that lower the amount)
    if (monthlySpent <= prevSpent.current && percentage <= prevPercentage) {
      return;
    }

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
          spent: formatCurrency(monthlySpent, defaultCurrency),
          budget: formatCurrency(monthlyBudget, defaultCurrency),
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
          remaining: formatCurrency(remaining, defaultCurrency),
        }),
      });
    }
  }, [monthlySpent, monthlyBudget, defaultCurrency, t]);
};
