import { useState } from 'react';
import type { Expense } from '@/types/Expense';

export type ExpenseAttachmentsApi = {
  receiptFile: File | null;
  removeExistingReceipt: boolean;
  showDetails: boolean;
  setReceiptFile: (file: File | null) => void;
  removeReceipt: () => void;
  toggleDetails: () => void;
};

// The optional half of the expense form — the receipt and the details drawer.
// Kept out of the form component because none of it participates in
// validation; it is pure UI state that rides along to the submit handler.
export const useExpenseAttachments = (
  expense?: Expense,
): ExpenseAttachmentsApi => {
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [removeExistingReceipt, setRemoveExistingReceipt] = useState(false);
  // An expense that already carries a tag or a receipt opens with the drawer
  // down, so the thing the user came back to edit is on screen.
  const [showDetails, setShowDetails] = useState(() =>
    Boolean(expense?.tag_id || expense?.receipt_path),
  );

  return {
    receiptFile,
    removeExistingReceipt,
    showDetails,
    setReceiptFile,
    removeReceipt: () => setRemoveExistingReceipt(true),
    toggleDetails: () => setShowDetails((prev) => !prev),
  };
};
