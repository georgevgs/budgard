import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { UseFormReturn } from 'react-hook-form';
import { useAccountOps } from '@/hooks/dataOps/useAccountOps';
import { parseCurrencyInput } from '@/lib/utils';
import type { AccountBalanceFormData } from '@/lib/validations';
import type { Account } from '@/types/Account';
import type { SnapshotMode } from '@/components/networth/BalanceSnapshotForm';

type UseSnapshotSubmitArgs = {
  form: UseFormReturn<AccountBalanceFormData>;
  account: Account;
  mode: SnapshotMode;
  onClose: () => void;
};

export const useSnapshotSubmit = ({
  form,
  account,
  mode,
  onClose,
}: UseSnapshotSubmitArgs) => {
  const { t } = useTranslation();
  const { handleSnapshotCreate } = useAccountOps();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isInvestment = account.kind === 'investment';
  const isContributionMode = isInvestment && mode === 'contribution';
  const isWithdrawalMode = isInvestment && mode === 'withdrawal';
  const isCashflowMode = isContributionMode || isWithdrawalMode;

  const handleSubmit = async (values: AccountBalanceFormData) => {
    setIsSubmitting(true);
    try {
      const recordedAt = format(values.recorded_at, 'yyyy-MM-dd');

      let contribution: number | null = null;
      if (isInvestment && values.contribution_delta) {
        const trimmed = values.contribution_delta.trim();
        if (trimmed.length > 0) {
          let sign = 1;
          if (trimmed.startsWith('-')) {
            sign = -1;
          }

          const magnitude = parseCurrencyInput(trimmed.replace(/^-/, ''));
          if (isWithdrawalMode) {
            contribution = -Math.abs(magnitude);
          } else if (isContributionMode) {
            contribution = Math.abs(magnitude);
          } else {
            contribution = sign * magnitude;
          }
        }
      }

      if (isCashflowMode && (contribution == null || contribution === 0)) {
        form.setError('contribution_delta', {
          type: 'required',
          message: t('networth.snapshot.contributionRequired'),
        });
        setIsSubmitting(false);

        return;
      }

      let balance: number;
      if (isCashflowMode) {
        balance = account.current_balance + (contribution ?? 0);
      } else {
        balance = parseCurrencyInput(values.balance);
      }

      await handleSnapshotCreate({
        account_id: account.id,
        balance,
        contribution_delta: contribution,
        recorded_at: recordedAt,
        note: values.note?.trim() || null,
      });
      onClose();
    } catch {
      // toast already shown
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, handleSubmit };
};
