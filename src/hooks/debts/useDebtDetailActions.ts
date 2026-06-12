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
      await handleExpenseDelete(id);
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
