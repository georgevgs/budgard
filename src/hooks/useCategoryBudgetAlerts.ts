import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

const WARNING_THRESHOLD = 80;
const EXCEEDED_THRESHOLD = 100;

export type CategoryBudgetAlertInput = {
  categoryId: string;
  categoryName: string;
  cap: number;
  spent: number;
};

type AlertState = {
  prevSpent: number | null;
  prevCap: number;
  shownWarning: boolean;
  shownExceeded: boolean;
};

type UseCategoryBudgetAlertsProps = {
  alerts: CategoryBudgetAlertInput[];
  defaultCurrency: string;
  // Disables alerts when the dashboard is showing a non-current month —
  // alerts should only fire on real-time spending.
  enabled: boolean;
};

// Mirrors `useBudgetAlerts` but keyed per category. Each category gets its
// own 80% / 100% toast, fired only when crossing a threshold upward (so
// deletions don't re-trigger). Resets the per-category state when its cap
// changes.
export const useCategoryBudgetAlerts = ({
  alerts,
  defaultCurrency,
  enabled,
}: UseCategoryBudgetAlertsProps): void => {
  const { t } = useTranslation();
  const stateRef = useRef<Map<string, AlertState>>(new Map());

  useEffect(() => {
    if (!enabled) return;

    const state = stateRef.current;
    const seenIds = new Set<string>();

    for (const alert of alerts) {
      seenIds.add(alert.categoryId);

      if (alert.cap <= 0) continue;

      let entry = state.get(alert.categoryId);

      // Reset when the cap is changed by the user.
      if (!entry || entry.prevCap !== alert.cap) {
        entry = {
          prevSpent: null,
          prevCap: alert.cap,
          shownWarning: false,
          shownExceeded: false,
        };
        state.set(alert.categoryId, entry);
      }

      if (alert.spent <= 0) continue;

      // First time we see real spending — record but don't alert (page load).
      if (entry.prevSpent === null) {
        entry.prevSpent = alert.spent;
        continue;
      }

      const prev = entry.prevSpent;
      const prevPercent = (prev / alert.cap) * 100;
      const percent = (alert.spent / alert.cap) * 100;
      entry.prevSpent = alert.spent;

      // Only fire when crossing a threshold *upward*.
      if (alert.spent <= prev) continue;

      if (
        percent >= EXCEEDED_THRESHOLD &&
        prevPercent < EXCEEDED_THRESHOLD &&
        !entry.shownExceeded
      ) {
        entry.shownExceeded = true;
        haptics.warning();
        toast({
          variant: 'destructive',
          title: t('budget.categoryAlerts.exceeded', {
            category: alert.categoryName,
          }),
          description: t('budget.categoryAlerts.exceededDescription', {
            category: alert.categoryName,
            spent: formatCurrency(alert.spent, defaultCurrency),
            cap: formatCurrency(alert.cap, defaultCurrency),
          }),
        });
        continue;
      }

      if (
        percent >= WARNING_THRESHOLD &&
        prevPercent < WARNING_THRESHOLD &&
        !entry.shownWarning
      ) {
        entry.shownWarning = true;
        haptics.warning();
        toast({
          title: t('budget.categoryAlerts.warning', {
            category: alert.categoryName,
          }),
          description: t('budget.categoryAlerts.warningDescription', {
            category: alert.categoryName,
            percent: Math.round(percent),
            remaining: formatCurrency(
              alert.cap - alert.spent,
              defaultCurrency,
            ),
          }),
        });
      }
    }

    // Drop entries for categories that no longer have a cap so a re-added
    // cap starts fresh rather than reusing stale prevSpent.
    for (const id of state.keys()) {
      if (!seenIds.has(id)) state.delete(id);
    }
  }, [alerts, defaultCurrency, enabled, t]);
};
