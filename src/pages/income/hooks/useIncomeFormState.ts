import { useCallback, useState } from 'react';
import type { Expense } from '@/types/Expense';

export const useIncomeFormState = () => {
  const [selectedIncome, setSelectedIncome] = useState<Expense | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleIncomeEdit = useCallback((income: Expense) => {
    if (income.id.startsWith('temp-')) return;
    setSelectedIncome(income);
    setIsFormOpen(true);
  }, []);

  const handleAddClick = useCallback(() => {
    setSelectedIncome(undefined);
    setIsFormOpen(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setIsFormOpen(false);
    setSelectedIncome(undefined);
  }, []);

  return {
    selectedIncome,
    isFormOpen,
    handleIncomeEdit,
    handleAddClick,
    handleFormClose,
  };
};
