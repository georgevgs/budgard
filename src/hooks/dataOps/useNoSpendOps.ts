import { useCallback, useMemo } from 'react';
import * as Sentry from '@/lib/sentry';
import { useTranslation } from 'react-i18next';
import { useDataActions } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { NoSpendDay } from '@/types/NoSpendDay';
import { useShowErrorToast } from '@/hooks/dataOps/useShowErrorToast';

export const useNoSpendOps = () => {
  const { setNoSpendDays } = useDataActions();
  const { t } = useTranslation();
  const showErrorToast = useShowErrorToast();

  const handleNoSpendClaim = useCallback(
    async (day: string) => {
      const run = async () => {
        let previous: NoSpendDay[] = [];
        setNoSpendDays((prev) => {
          previous = prev;
          if (prev.some((entry) => entry.day === day)) {
            return prev;
          }

          return [buildOptimisticDay(day), ...prev];
        });

        try {
          const saved = await dataService.createNoSpendDay(day);
          haptics.success();
          // The upsert ignores duplicates, so a day that was already claimed
          // comes back null. The optimistic row is already correct in that
          // case — only a real insert needs reconciling with server columns.
          if (saved) {
            setNoSpendDays((prev) => [
              saved,
              ...prev.filter((entry) => entry.day !== day),
            ]);
          }
        } catch (error) {
          haptics.error();
          setNoSpendDays(previous);
          Sentry.captureException(error, {
            tags: { operation: 'createNoSpendDay' },
          });
          showErrorToast(t('today.rhythm.toasts.claimFailed'), () => {
            void run().catch(() => undefined);
          });
          throw error;
        }
      };

      return run();
    },
    [setNoSpendDays, showErrorToast, t],
  );

  // Undo. Claiming a no-spend day is one tap, so getting it wrong must also be
  // one tap — a banked day the user cannot take back is a lie they are stuck
  // with, and the meter stops meaning anything the moment that happens.
  const handleNoSpendUndo = useCallback(
    async (day: string) => {
      const run = async () => {
        let previous: NoSpendDay[] = [];
        setNoSpendDays((prev) => {
          previous = prev;

          return prev.filter((entry) => entry.day !== day);
        });

        try {
          await dataService.deleteNoSpendDay(day);
          haptics.selection();
        } catch (error) {
          haptics.error();
          setNoSpendDays(previous);
          Sentry.captureException(error, {
            tags: { operation: 'deleteNoSpendDay' },
          });
          showErrorToast(t('today.rhythm.toasts.undoFailed'), () => {
            void run().catch(() => undefined);
          });
          throw error;
        }
      };

      return run();
    },
    [setNoSpendDays, showErrorToast, t],
  );

  return useMemo(
    () => ({ handleNoSpendClaim, handleNoSpendUndo }),
    [handleNoSpendClaim, handleNoSpendUndo],
  );
};

// --- Helpers ---

// user_id is filled by the column default server-side; the optimistic row only
// has to satisfy the shape the rhythm hook reads, which is `day`.
const buildOptimisticDay = (day: string): NoSpendDay => ({
  user_id: '',
  day,
  created_at: new Date().toISOString(),
});
