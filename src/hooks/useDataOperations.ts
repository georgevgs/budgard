import { useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { dataService } from '@/services/dataService';
import { useData } from '@/contexts/DataContext';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import type { RecurringExpense } from '@/types/RecurringExpense';
import { uploadReceipt, deleteReceipt } from '@/services/receiptService';
import { haptics } from '@/lib/haptics';

export interface ReceiptOptions {
  receiptFile: File | null;
  removeExistingReceipt: boolean;
  existingReceiptPath: string | null;
}

export function useDataOperations() {
  const {
    expenses,
    categories,
    recurringExpenses,
    isInitialized,
    setExpenses,
    setCategories,
    setRecurringExpenses,
  } = useData();
  const { toast } = useToast();

  const showErrorToast = useCallback(
    (message: string) => {
      toast({
        variant: 'destructive',
        description: message,
        className: 'border-2 border-destructive bg-destructive/5',
      });
    },
    [toast],
  );

  const handleExpenseSubmit = useCallback(
    async (
      expenseData: Partial<Expense>,
      expenseId?: string,
      receiptOptions?: ReceiptOptions,
    ) => {
      if (!isInitialized) {
        return;
      }

      const optimisticExpense = {
        ...expenseData,
        id: expenseId || `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        category: expenseData.category_id
          ? categories.find((c) => c.id === expenseData.category_id)
          : undefined,
      } as Expense;

      const updatedExpenses = expenseId
        ? expenses.map((e) =>
            e.id === expenseId ? { ...e, ...optimisticExpense } : e,
          )
        : [optimisticExpense, ...expenses];

      setExpenses(updatedExpenses);

      try {
        const savedExpense = expenseId
          ? await dataService.updateExpense(expenseData, expenseId)
          : await dataService.createExpense(expenseData);

        // Handle receipt after expense is saved (we need the real ID)
        let receiptPath = savedExpense.receipt_path ?? null;

        if (receiptOptions) {
          const { receiptFile, removeExistingReceipt, existingReceiptPath } =
            receiptOptions;

          // Upload new receipt first, then delete old one to prevent data loss
          if (receiptFile && expenseData.user_id) {
            receiptPath = await uploadReceipt(
              receiptFile,
              expenseData.user_id,
              savedExpense.id,
            );
            // Clean up old receipt after successful upload
            if (existingReceiptPath) {
              deleteReceipt(existingReceiptPath).catch(() => {});
            }
          } else if (removeExistingReceipt) {
            receiptPath = null;
            if (existingReceiptPath) {
              deleteReceipt(existingReceiptPath).catch(() => {});
            }
          }

          // Update expense with receipt_path if changed
          if (receiptPath !== (savedExpense.receipt_path ?? null)) {
            const updated = await dataService.updateExpense(
              { receipt_path: receiptPath },
              savedExpense.id,
            );
            savedExpense.receipt_path = updated.receipt_path;
          }
        }

        const finalExpenses = expenseId
          ? expenses.map((e) => (e.id === expenseId ? savedExpense : e))
          : [
              savedExpense,
              ...expenses.filter((e) => e.id !== optimisticExpense.id),
            ];

        haptics.success();
        setExpenses(finalExpenses);
      } catch (error) {
        haptics.error();
        setExpenses(expenses);
        showErrorToast(`Failed to ${expenseId ? 'update' : 'add'} expense`);
        throw error;
      }
    },
    [categories, expenses, isInitialized, setExpenses, showErrorToast],
  );

  const handleExpenseDelete = useCallback(
    async (expenseId: string) => {
      if (!isInitialized) {
        return;
      }

      const previousExpenses = expenses;
      const expenseToDelete = expenses.find((e) => e.id === expenseId);
      const updatedExpenses = expenses.filter((e) => e.id !== expenseId);
      setExpenses(updatedExpenses);

      try {
        haptics.warning();
        await dataService.deleteExpense(expenseId);

        // Fire-and-forget receipt cleanup
        if (expenseToDelete?.receipt_path) {
          deleteReceipt(expenseToDelete.receipt_path).catch(() => {});
        }
      } catch (error) {
        haptics.error();
        setExpenses(previousExpenses);
        showErrorToast('Failed to delete expense');
        throw error;
      }
    },
    [expenses, isInitialized, setExpenses, showErrorToast],
  );

  const handleCategoryAdd = useCallback(
    async (categoryData: Partial<Category>) => {
      if (!isInitialized) {
        return;
      }

      const optimisticCategory = {
        ...categoryData,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
      } as Category;

      const updatedCategories = [...categories, optimisticCategory];
      setCategories(updatedCategories);

      try {
        const savedCategory = await dataService.createCategory(categoryData);
        haptics.success();
        const finalCategories = [...categories, savedCategory].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        setCategories(finalCategories);
      } catch (error) {
        haptics.error();
        setCategories(categories);
        showErrorToast('Failed to add category');
        throw error;
      }
    },
    [categories, isInitialized, setCategories, showErrorToast],
  );

  const handleRecurringExpenseSubmit = useCallback(
    async (expenseData: Partial<RecurringExpense>, expenseId?: string) => {
      if (!isInitialized) {
        return;
      }

      const optimisticExpense = {
        ...expenseData,
        id: expenseId || `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        active: true,
        category: expenseData.category_id
          ? categories.find((c) => c.id === expenseData.category_id)
          : undefined,
      } as RecurringExpense;

      const updatedExpenses = expenseId
        ? recurringExpenses.map((e) =>
            e.id === expenseId ? { ...e, ...optimisticExpense } : e,
          )
        : [optimisticExpense, ...recurringExpenses];

      setRecurringExpenses(updatedExpenses);

      try {
        const savedExpense = expenseId
          ? await dataService.updateRecurringExpense(expenseData, expenseId)
          : await dataService.createRecurringExpense(expenseData);

        const finalExpenses = expenseId
          ? recurringExpenses.map((e) =>
              e.id === expenseId ? savedExpense : e,
            )
          : [
              savedExpense,
              ...recurringExpenses.filter((e) => e.id !== optimisticExpense.id),
            ];

        setRecurringExpenses(finalExpenses);
      } catch (error) {
        setRecurringExpenses(recurringExpenses);
        showErrorToast(
          `Failed to ${expenseId ? 'update' : 'add'} recurring expense`,
        );
        throw error;
      }
    },
    [
      categories,
      recurringExpenses,
      isInitialized,
      setRecurringExpenses,
      showErrorToast,
    ],
  );

  const handleRecurringExpenseDelete = useCallback(
    async (expenseId: string) => {
      if (!isInitialized) {
        return;
      }

      const previousExpenses = recurringExpenses;
      const updatedExpenses = recurringExpenses.filter(
        (e) => e.id !== expenseId,
      );
      setRecurringExpenses(updatedExpenses);

      try {
        await dataService.deleteRecurringExpense(expenseId);
      } catch (error) {
        setRecurringExpenses(previousExpenses);
        showErrorToast('Failed to delete recurring expense');
        throw error;
      }
    },
    [recurringExpenses, isInitialized, setRecurringExpenses, showErrorToast],
  );

  const handleRecurringExpenseToggle = useCallback(
    async (expenseId: string, active: boolean) => {
      if (!isInitialized) {
        return;
      }

      const previousExpenses = recurringExpenses;
      const updatedExpenses = recurringExpenses.map((e) =>
        e.id === expenseId ? { ...e, active } : e,
      );
      setRecurringExpenses(updatedExpenses);

      try {
        await dataService.toggleRecurringExpense(expenseId, active);
      } catch (error) {
        setRecurringExpenses(previousExpenses);
        showErrorToast('Failed to update recurring expense status');
        throw error;
      }
    },
    [recurringExpenses, isInitialized, setRecurringExpenses, showErrorToast],
  );

  return {
    handleExpenseSubmit,
    handleExpenseDelete,
    handleCategoryAdd,
    handleRecurringExpenseSubmit,
    handleRecurringExpenseDelete,
    handleRecurringExpenseToggle,
  };
}
