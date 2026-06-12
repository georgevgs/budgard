import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDebtOps } from '@/hooks/dataOps/useDebtOps';
import { parseCurrencyInput } from '@/lib/utils';
import type { DebtFormData } from '@/lib/validations';
import type { Debt } from '@/types/Debt';

type UseDebtSubmitArgs = {
  debt: Debt | undefined;
  onClose: () => void;
};

export const useDebtSubmit = ({ debt, onClose }: UseDebtSubmitArgs) => {
  const { session } = useAuth();
  const { handleDebtSubmit } = useDebtOps();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: DebtFormData) => {
    if (!session?.user?.id) return;

    setIsSubmitting(true);
    try {
      const balance = parseCurrencyInput(values.current_balance);
      const minPayment = parseCurrencyInput(values.minimum_payment);
      const apr = Number(values.apr.replace(',', '.'));

      if (debt) {
        await handleDebtSubmit(
          {
            name: values.name,
            kind: values.kind,
            currency: values.currency,
            apr,
            minimum_payment: minPayment,
            icon: values.icon,
            color: values.color,
          },
          debt.id,
        );
        onClose();

        return;
      }

      await handleDebtSubmit({
        name: values.name,
        kind: values.kind,
        currency: values.currency,
        current_balance: balance,
        apr,
        minimum_payment: minPayment,
        icon: values.icon,
        color: values.color,
        user_id: session.user.id,
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
