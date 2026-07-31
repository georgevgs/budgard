import { useCallback, useState } from 'react';
import { FORM_TYPES, type FormType } from '@/components/layout/formTypes';
import type { Expense } from '@/types/Expense';

export const useExpenseFormState = () => {
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [formType, setFormType] = useState<FormType>(null);

  const handleFormClose = useCallback(() => {
    setFormType(null);
    setSelectedExpense(undefined);
  }, []);

  const handleExpenseEdit = useCallback((expense: Expense) => {
    if (expense.id.startsWith('temp-')) return;
    setSelectedExpense(expense);
    setFormType(FORM_TYPES.EDIT_EXPENSE);
  }, []);

  const openNewExpenseForm = useCallback(() => {
    setFormType(FORM_TYPES.NEW_EXPENSE);
  }, []);

  const openNewCategoryForm = useCallback(() => {
    setFormType(FORM_TYPES.NEW_CATEGORY);
  }, []);

  return {
    formType,
    setFormType,
    selectedExpense,
    handleFormClose,
    handleExpenseEdit,
    openNewExpenseForm,
    openNewCategoryForm,
  };
};
