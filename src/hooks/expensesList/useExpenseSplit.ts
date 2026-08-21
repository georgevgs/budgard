import { useState } from 'react';
import { useExpenseOps } from '@/hooks/dataOps/useExpenseOps';
import { parseCurrencyInput } from '@/lib/utils';
import type { Expense } from '@/types/Expense';

export const MAX_SPLIT_PARTS = 6;

export type SplitPart = {
  amount: string;
  category_id: string;
};

export type ExpenseSplitApi = {
  parts: SplitPart[];
  remaining: number;
  canConfirm: boolean;
  isSaving: boolean;
  updatePart: (index: number, patch: Partial<SplitPart>) => void;
  addPart: () => void;
  removePart: (index: number) => void;
  confirm: () => Promise<void>;
};

// Splitting one expense into several is a small state machine — parts, the
// unallocated remainder, and whether the whole thing balances. It lives here
// rather than in the dialog so the dialog is only the shape of the form.
export const useExpenseSplit = (
  expense: Expense,
  open: boolean,
  onDone: () => void,
): ExpenseSplitApi => {
  const { handleExpenseSplit } = useExpenseOps();
  const [parts, setParts] = useState<SplitPart[]>(() =>
    buildInitialParts(expense),
  );
  const [isSaving, setIsSaving] = useState(false);

  // Reopening the dialog — or opening it on a different expense — starts over.
  // Recorded during render rather than in an effect so the first frame after
  // the change already shows the reset rows instead of the previous split.
  const [prevInputs, setPrevInputs] = useState({ open, expense });
  const inputsChanged =
    prevInputs.open !== open || prevInputs.expense !== expense;
  if (inputsChanged) {
    setPrevInputs({ open, expense });
    if (open) {
      setParts(buildInitialParts(expense));
    }
  }

  const remaining = expense.amount - sumParts(parts);
  const partsValid = parts.every((part) => parseCurrencyInput(part.amount) > 0);

  const updatePart = (index: number, patch: Partial<SplitPart>) => {
    setParts((prev) =>
      prev.map((part, position) => {
        if (position !== index) {
          return part;
        }

        return { ...part, ...patch };
      }),
    );
  };

  const addPart = () => {
    setParts((prev) => [...prev, { amount: '', category_id: 'none' }]);
  };

  const removePart = (index: number) => {
    setParts((prev) => prev.filter((_, position) => position !== index));
  };

  const confirm = async () => {
    setIsSaving(true);
    try {
      await handleExpenseSplit(
        expense,
        parts.map((part) => ({
          amount: parseCurrencyInput(part.amount),
          category_id: normalizeCategoryId(part.category_id),
        })),
      );
      onDone();
    } catch {
      // The error toast is raised by useExpenseOps; the dialog stays open so
      // the user keeps the split they typed and can retry.
    }
    setIsSaving(false);
  };

  return {
    parts,
    remaining,
    canConfirm: partsValid && isSettled(remaining) && !isSaving,
    isSaving,
    updatePart,
    addPart,
    removePart,
    confirm,
  };
};

// A split balances when the parts land within half a cent of the original —
// exact equality would be unreachable after currency parsing rounds.
export const isSettled = (remaining: number): boolean => {
  return Math.abs(remaining) < 0.005;
};

// --- Helpers ---

const buildInitialParts = (expense: Expense): SplitPart[] => {
  return [
    { amount: '', category_id: expense.category_id ?? 'none' },
    { amount: '', category_id: 'none' },
  ];
};

const sumParts = (parts: SplitPart[]): number => {
  return parts.reduce((sum, part) => sum + parseCurrencyInput(part.amount), 0);
};

const normalizeCategoryId = (value: string): string | null => {
  if (value === 'none') {
    return null;
  }

  return value;
};
