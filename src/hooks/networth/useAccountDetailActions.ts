import { useState } from 'react';
import { useAccountOps } from '@/hooks/dataOps/useAccountOps';
import type { Account } from '@/types/Account';

type UseAccountDetailActionsArgs = {
  account: Account;
  onClose: () => void;
  removeSnapshot: (id: string) => void;
};

export const useAccountDetailActions = ({
  account,
  onClose,
  removeSnapshot,
}: UseAccountDetailActionsArgs) => {
  const { handleAccountArchive, handleSnapshotDelete } = useAccountOps();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [snapshotToDelete, setSnapshotToDelete] = useState<string | null>(null);

  const handleArchiveConfirm = async () => {
    setShowArchiveDialog(false);
    try {
      await handleAccountArchive(account.id);
      onClose();
    } catch {
      // toast already shown
    }
  };

  const handleSnapshotDeleteConfirm = async () => {
    if (!snapshotToDelete) {
      return;
    }

    const id = snapshotToDelete;
    setSnapshotToDelete(null);
    try {
      await handleSnapshotDelete(id, account.id);
      removeSnapshot(id);
    } catch {
      // toast already shown
    }
  };

  return {
    showArchiveDialog,
    setShowArchiveDialog,
    snapshotToDelete,
    setSnapshotToDelete,
    handleArchiveConfirm,
    handleSnapshotDeleteConfirm,
  };
};
