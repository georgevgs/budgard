import { useState } from 'react';
import type { Expense } from '@/types/Expense';

export type ExpenseAttachmentsApi = {
  receiptFile: File | null;
  shouldRemoveExistingReceipt: boolean;
  shouldShowDetails: boolean;
  setReceiptFile: (file: File | null) => void;
  removeReceipt: () => void;
  toggleDetails: () => void;
};

// The optional half of the expense form — the receipt and the details drawer.
// Kept out of the form component because none of it participates in
// validation; it is pure UI state that rides along to the submit handler.
export const useExpenseAttachments = (
  expense?: Expense,
  draftReceiptFile?: File,
): ExpenseAttachmentsApi => {
  const [receiptFile, setReceiptFile] = useState<File | null>(
    draftReceiptFile ?? null,
  );
  const [shouldRemoveExistingReceipt, setShouldRemoveExistingReceipt] = useState(false);
  // An expense that already carries a tag or a receipt opens with the drawer
  // down, so the thing the user came back to edit is on screen.
  const [shouldShowDetails, setShouldShowDetails] = useState(() =>
    Boolean(expense?.tag_id || expense?.receipt_path || draftReceiptFile),
  );

  return {
    receiptFile,
    shouldRemoveExistingReceipt,
    shouldShowDetails,
    setReceiptFile,
    removeReceipt: () => setShouldRemoveExistingReceipt(true),
    toggleDetails: () => setShouldShowDetails((prev) => !prev),
  };
};
