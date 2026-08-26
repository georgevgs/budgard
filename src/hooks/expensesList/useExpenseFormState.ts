import { useCallback, useState } from 'react';
import { FORM_TYPES, type FormType } from '@/components/layout/formTypes';
import type { Expense } from '@/types/Expense';
import type { ExpenseWritePayload } from '@/services/dataService';

export const useExpenseFormState = () => {
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [formType, setFormType] = useState<FormType>(null);
  const [draft, setDraft] = useState<ExpenseWritePayload | undefined>();
  const [draftReceiptFile, setDraftReceiptFile] = useState<File | undefined>();

  const handleFormClose = useCallback(() => {
    setFormType(null);
    setSelectedExpense(undefined);
    setDraft(undefined);
    setDraftReceiptFile(undefined);
  }, []);

  const handleExpenseEdit = useCallback((expense: Expense) => {
    if (expense.id.startsWith('temp-')) return;
    setSelectedExpense(expense);
    setFormType(FORM_TYPES.EDIT_EXPENSE);
  }, []);

  // The FAB opens the keypad; the full form is a step past it.
  const openNewExpenseForm = useCallback(() => {
    setFormType(FORM_TYPES.QUICK_ADD);
  }, []);

  // Carries whatever the keypad captured into the full form, so asking for
  // more detail never costs the user the amount they already typed.
  const openFullForm = useCallback(
    (captured: ExpenseWritePayload, receiptFile?: File) => {
      setDraft(captured);
      setDraftReceiptFile(receiptFile);
      setFormType(FORM_TYPES.NEW_EXPENSE);
    },
    [],
  );

  return {
    formType,
    setFormType,
    selectedExpense,
    draft,
    draftReceiptFile,
    handleFormClose,
    handleExpenseEdit,
    openNewExpenseForm,
    openFullForm,
  };
};
