import { useTranslation } from 'react-i18next';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { useMutationRunner } from '@/hooks/dataOps/useMutationRunner';
import { goalFundingService } from '@/services/goalFundingService';
import type { Expense } from '@/types/Expense';

export const useSurplusInvestmentOps = () => {
  const { isInitialized } = useDataConfig();
  const { refreshAccounts, refreshExpenses } = useDataActions();
  const runMutation = useMutationRunner();
  const { t } = useTranslation();

  const investSurplus = async (
    goalId: string,
    amount: number,
    investedOn: string,
  ): Promise<Expense | null> => {
    const saved = await runMutation<Expense>({
      operation: 'investGoalSurplus',
      skip: !isInitialized,
      errorMessage: t('today.rhythm.setAside.investFailed'),
      successMessage: t('today.rhythm.setAside.invested'),
      perform: () =>
        goalFundingService.investSurplus(
          goalId,
          amount,
          investedOn,
          t('today.rhythm.setAside.description'),
        ),
      commit: async () => {
        await Promise.all([refreshAccounts(), refreshExpenses()]);
      },
    });

    return saved ?? null;
  };

  return { investSurplus };
};
