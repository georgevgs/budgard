import { useTranslation } from 'react-i18next';
import { useDataConfig } from '@/common/contexts/DataContext';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';
import { transactionRuleService } from '@/common/api/transactionRuleService';
import { useMutationRunner } from '@/common/hooks/dataOps/useMutationRunner';
import { removeOptimistic } from '@/common/hooks/dataOps/helpers';
import { haptics } from '@/constants/haptics';
import type { TransactionRule } from '@/types/TransactionRule';

type TransactionRuleSetter = (
  update:
    TransactionRule[] | ((current: TransactionRule[]) => TransactionRule[]),
) => void;

export const useTransactionRuleOps = (setRules: TransactionRuleSetter) => {
  const { t } = useTranslation();
  const { isInitialized } = useDataConfig();
  const { activeOwnerId } = useFinancialSpace();
  const runMutation = useMutationRunner();

  const deleteRule = (ruleId: string): Promise<void | undefined> =>
    runMutation({
      operation: 'deleteTransactionRule',
      shouldSkip: !isInitialized,
      errorMessage: t('settings.rules.deleteFailed'),
      successMessage: t('settings.rules.deleted'),
      onStart: () => haptics.warning(),
      optimistic: () => removeOptimistic(setRules, ruleId),
      perform: () => transactionRuleService.deleteRule(ruleId, activeOwnerId),
    });

  return { deleteRule };
};
