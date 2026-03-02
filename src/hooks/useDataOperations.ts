import { useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { dataService } from '@/services/dataService';
import { useData } from '@/contexts/DataContext';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import type { RecurringExpense } from '@/types/RecurringExpense';
import type { Tag } from '@/types/Tag';
import { uploadReceipt, deleteReceipt } from '@/services/receiptService';
import { haptics } from '@/lib/haptics';

export interface ReceiptOptions {
  receiptFile: File | null;
  removeExistingReceipt: boolean;
  existingReceiptPath: string | null;
}

export function useDataOperations() {
  const {
    isInitialized,
    setExpenses,
    setCategories,
    setTags,
    setRecurringExpenses,
  } = useData();
  const { toast } = useToast();

  const showErrorToast = useCallback(
    (message: string) => {
      toast({ variant: 'destructive', description: message });
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

        haptics.success();
        toast({
          variant: 'success',
          title: expenseId ? 'Expense updated' : 'Expense added',
        });
        setExpenses((prev) =>
          expenseId
            ? prev.map((e) => (e.id === expenseId ? savedExpense : e))
            : [savedExpense, ...prev],
        );
      } catch (error) {
        haptics.error();
        showErrorToast(`Failed to ${expenseId ? 'update' : 'add'} expense`);
        throw error;
      }
    },
    [isInitialized, setExpenses, showErrorToast, toast],
  );

  const handleExpenseDelete = useCallback(
    async (expenseId: string) => {
      if (!isInitialized) {
        return;
      }

      haptics.warning();
      try {
        await dataService.deleteExpense(expenseId);

        // Read receipt path and update state atomically
        let receiptPath: string | null = null;
        setExpenses((prev) => {
          receiptPath = prev.find((e) => e.id === expenseId)?.receipt_path ?? null;
          return prev.filter((e) => e.id !== expenseId);
        });

        // Fire-and-forget receipt cleanup
        if (receiptPath) {
          deleteReceipt(receiptPath).catch(() => {});
        }
      } catch (error) {
        haptics.error();
        showErrorToast('Failed to delete expense');
        throw error;
      }
    },
    [isInitialized, setExpenses, showErrorToast],
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

      // Optimistic add — capture snapshot for rollback
      let snapshot: Category[] = [];
      setCategories((prev) => {
        snapshot = prev;
        return [...prev, optimisticCategory];
      });

      try {
        const savedCategory = await dataService.createCategory(categoryData);
        haptics.success();
        setCategories((prev) =>
          [
            ...prev.filter((c) => c.id !== optimisticCategory.id),
            savedCategory,
          ].sort((a, b) => a.name.localeCompare(b.name)),
        );
      } catch (error) {
        haptics.error();
        setCategories(snapshot);
        showErrorToast('Failed to add category');
        throw error;
      }
    },
    [isInitialized, setCategories, showErrorToast],
  );

  const handleRecurringExpenseSubmit = useCallback(
    async (expenseData: Partial<RecurringExpense>, expenseId?: string) => {
      if (!isInitialized) {
        return;
      }

      try {
        const savedExpense = expenseId
          ? await dataService.updateRecurringExpense(expenseData, expenseId)
          : await dataService.createRecurringExpense(expenseData);

        setRecurringExpenses((prev) =>
          expenseId
            ? prev.map((e) => (e.id === expenseId ? savedExpense : e))
            : [savedExpense, ...prev],
        );
      } catch (error) {
        showErrorToast(
          `Failed to ${expenseId ? 'update' : 'add'} recurring expense`,
        );
        throw error;
      }
    },
    [isInitialized, setRecurringExpenses, showErrorToast],
  );

  const handleRecurringExpenseDelete = useCallback(
    async (expenseId: string) => {
      if (!isInitialized) {
        return;
      }

      try {
        await dataService.deleteRecurringExpense(expenseId);
        setRecurringExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      } catch (error) {
        showErrorToast('Failed to delete recurring expense');
        throw error;
      }
    },
    [isInitialized, setRecurringExpenses, showErrorToast],
  );

  const handleRecurringExpenseToggle = useCallback(
    async (expenseId: string, active: boolean) => {
      if (!isInitialized) {
        return;
      }

      try {
        await dataService.toggleRecurringExpense(expenseId, active);
        setRecurringExpenses((prev) =>
          prev.map((e) => (e.id === expenseId ? { ...e, active } : e)),
        );
      } catch (error) {
        showErrorToast('Failed to update recurring expense status');
        throw error;
      }
    },
    [isInitialized, setRecurringExpenses, showErrorToast],
  );

  const handleTagCreate = useCallback(
    async (name: string, color: string): Promise<Tag> => {
      const optimisticTag: Tag = {
        id: `temp-${Date.now()}`,
        user_id: '',
        name,
        color,
        created_at: new Date().toISOString(),
      };

      // Optimistic add — capture snapshot for rollback
      let snapshot: Tag[] = [];
      setTags((prev) => {
        snapshot = prev;
        return [...prev, optimisticTag].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      });

      try {
        const savedTag = await dataService.createTag({ name, color });
        haptics.success();
        setTags((prev) =>
          [
            ...prev.filter((t) => t.id !== optimisticTag.id),
            savedTag,
          ].sort((a, b) => a.name.localeCompare(b.name)),
        );
        return savedTag;
      } catch (error) {
        haptics.error();
        setTags(snapshot);
        showErrorToast('Failed to create tag');
        throw error;
      }
    },
    [setTags, showErrorToast],
  );

  return {
    handleExpenseSubmit,
    handleExpenseDelete,
    handleCategoryAdd,
    handleTagCreate,
    handleRecurringExpenseSubmit,
    handleRecurringExpenseDelete,
    handleRecurringExpenseToggle,
  };
}
