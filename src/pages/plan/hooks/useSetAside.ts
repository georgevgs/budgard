import { useCallback } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useDataConfig } from '@/common/contexts/DataContext';
import { useExpenseOps } from '@/common/hooks/dataOps/useExpenseOps';
import { useSurplusInvestmentOps } from '@/common/hooks/dataOps/useSurplusInvestmentOps';
import { roundMoney } from '@/constants/money';
import type { Goal } from '@/types/Goal';

// Moves a finished day's surplus into the real investment account linked to a
// goal. Legacy savings-category goals still work, but new account goals update
// an account balance and log the transfer atomically.
export const useSetAside = () => {
  const { handleExpenseSubmit } = useExpenseOps();
  const { investSurplus } = useSurplusInvestmentOps();
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();

  return useCallback(
    async (goal: Goal, amount: number) => {
      const roundedAmount = roundMoney(amount, defaultCurrency);
      const today = format(new Date(), 'yyyy-MM-dd');
      if (goal.source_type === 'account') {
        await investSurplus(goal.id, roundedAmount, today);

        return;
      }

      await handleExpenseSubmit({
        amount: roundedAmount,
        description: t('today.rhythm.setAside.description'),
        category_id: goal.category_id ?? undefined,
        date: today,
      });
    },
    [handleExpenseSubmit, investSurplus, t, defaultCurrency],
  );
};
