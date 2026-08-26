import { useMemo } from 'react';
import { useDataActions } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { useTranslation } from 'react-i18next';
import type { NoSpendDay } from '@/types/NoSpendDay';
import { useMutationRunner } from '@/hooks/dataOps/useMutationRunner';

// No-spend days are keyed by `day`, not by id, so these keep their own
// optimistic closures rather than using the id-based shape helpers.
export const useNoSpendOps = () => {
  const { setNoSpendDays } = useDataActions();
  const { t } = useTranslation();
  const runMutation = useMutationRunner();

  return useMemo(() => {
    const claimOptimistically = (day: string) => {
      let previous: NoSpendDay[] = [];
      setNoSpendDays((prev) => {
        previous = prev;
        if (prev.some((entry) => entry.day === day)) {
          return prev;
        }

        return [buildOptimisticDay(day), ...prev];
      });

      return () => setNoSpendDays(previous);
    };

    const handleNoSpendClaim = (day: string) =>
      runMutation({
        operation: 'createNoSpendDay',
        errorMessage: t('today.rhythm.toasts.claimFailed'),
        optimistic: () => claimOptimistically(day),
        perform: () => dataService.createNoSpendDay(day),
        // The upsert ignores duplicates, so a day that was already claimed
        // comes back null. The optimistic row is already correct in that
        // case — only a real insert needs reconciling with server columns.
        commit: (saved) => {
          if (!saved) return;

          setNoSpendDays((prev) => [
            saved,
            ...prev.filter((entry) => entry.day !== day),
          ]);
        },
      });

    // Undo. Claiming a no-spend day is one tap, so getting it wrong must also
    // be one tap — a banked day the user cannot take back is a lie they are
    // stuck with, and the meter stops meaning anything the moment that happens.
    const handleNoSpendUndo = (day: string) =>
      runMutation({
        operation: 'deleteNoSpendDay',
        errorMessage: t('today.rhythm.toasts.undoFailed'),
        successHaptic: 'selection',
        optimistic: () => {
          let previous: NoSpendDay[] = [];
          setNoSpendDays((prev) => {
            previous = prev;

            return prev.filter((entry) => entry.day !== day);
          });

          return () => setNoSpendDays(previous);
        },
        perform: () => dataService.deleteNoSpendDay(day),
      });

    return { handleNoSpendClaim, handleNoSpendUndo };
  }, [setNoSpendDays, runMutation, t]);
};

// --- Helpers ---

// user_id is filled by the column default server-side; the optimistic row only
// has to satisfy the shape the rhythm hook reads, which is `day`.
const buildOptimisticDay = (day: string): NoSpendDay => ({
  user_id: '',
  day,
  created_at: new Date().toISOString(),
});
