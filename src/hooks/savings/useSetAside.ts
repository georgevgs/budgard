import { useCallback } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useExpenseOps } from '@/hooks/dataOps/useExpenseOps';
import type { Goal } from '@/types/Goal';

// Records a set-aside as a real expense in the goal's savings category.
//
// Goals here are derived, not funded — progress is the sum of expenses in the
// goal's category — so this IS the transfer, in the same shape the goal already
// reads. Nothing about the number is hypothetical: it leaves the spending pool
// and lands somewhere with a name, which is the whole reason labelled pots
// change behaviour where a score does not.
export const useSetAside = () => {
  const { handleExpenseSubmit } = useExpenseOps();
  const { t } = useTranslation();

  return useCallback(
    async (goal: Goal, amount: number) => {
      await handleExpenseSubmit({
        amount: roundToCents(amount),
        description: t('today.rhythm.setAside.description'),
        category_id: goal.category_id ?? undefined,
        date: format(new Date(), 'yyyy-MM-dd'),
      });
    },
    [handleExpenseSubmit, t],
  );
};

// --- Helpers ---

// The surplus is an allowance division, so it arrives with a long tail of
// decimals. Money in the ledger has two.
const roundToCents = (amount: number): number => Math.round(amount * 100) / 100;
