import { useState } from 'react';
import { useAuth } from '@/common/contexts/AuthContext';
import { useAccountOps } from '@/common/hooks/dataOps/useAccountOps';
import { parseCurrencyInput } from '@/constants/utils';
import type { AccountFormData } from '@/constants/validations';
import type { Account } from '@/types/Account';

type UseAccountSubmitArgs = {
  account: Account | undefined;
  onClose: () => void;
};

export const useAccountSubmit = ({
  account,
  onClose,
}: UseAccountSubmitArgs) => {
  const { session } = useAuth();
  const { handleAccountSubmit } = useAccountOps();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: AccountFormData) => {
    if (!session?.user?.id) return;

    setIsSubmitting(true);
    try {
      if (account) {
        await handleAccountSubmit(
          {
            name: values.name,
            kind: values.kind,
            default_currency: values.default_currency,
            color: values.color,
          },
          account.id,
        );
        onClose();

        return;
      }

      await handleAccountSubmit({
        name: values.name,
        kind: values.kind,
        default_currency: values.default_currency,
        color: values.color,
        user_id: session.user.id,
        initial_balance: parseCurrencyInput(values.initial_balance),
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
