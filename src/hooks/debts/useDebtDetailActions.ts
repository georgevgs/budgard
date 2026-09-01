import { useState } from 'react';
import { useDebtOps } from '@/hooks/dataOps/useDebtOps';
import { useExpenseOps } from '@/hooks/dataOps/useExpenseOps';
import type { Debt } from '@/types/Debt';

type UseDebtDetailActionsArgs = {
  debt: Debt;
  onClose: () => void;
  removePayment: (id: string) => void;
};

export const useDebtDetailActions = ({
  debt,
  onClose,
  removePayment,
}: UseDebtDetailActionsArgs) => {
  const { handleDebtArchive } = useDebtOps();
  const { handleExpenseDelete } = useExpenseOps();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  const handleArchiveConfirm = async () => {
    setShowArchiveDialog(false);
    try {
      await handleDebtArchive(debt.id);
      onClose();
    } catch {
      // toast already shown
    }
  };

  const handlePaymentDeleteConfirm = async () => {
    if (!paymentToDelete) {
      return;
    }

    const id = paymentToDelete;
    setPaymentToDelete(null);
    try {
      // A logged payment is never in the global expense list (see
      // useExpenseOps), so the delete can't read the debt id back off a row
      // it will never find there — pass the one we already have instead, or
      // the balance shown on this screen goes stale until an unrelated
      // refresh happens to catch it up.
      await handleExpenseDelete(id, debt.id);
      removePayment(id);
    } catch {
      // toast already shown
    }
  };

  return {
    showArchiveDialog,
    setShowArchiveDialog,
    paymentToDelete,
    setPaymentToDelete,
    handleArchiveConfirm,
    handlePaymentDeleteConfirm,
  };
};
