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
    refreshExpenses,
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
        let receiptFailed = false;

        if (receiptOptions) {
          const { receiptFile, removeExistingReceipt, existingReceiptPath } =
            receiptOptions;

          // Upload new receipt first, then delete old one to prevent data loss
          if (receiptFile && expenseData.user_id) {
            try {
              receiptPath = await uploadReceipt(
                receiptFile,
                expenseData.user_id,
                savedExpense.id,
              );
              // Clean up old receipt after successful upload
              if (existingReceiptPath) {
                deleteReceipt(existingReceiptPath).catch(() => {});
              }
            } catch {
              receiptFailed = true;
            }
          } else if (removeExistingReceipt) {
            receiptPath = null;
            if (existingReceiptPath) {
              deleteReceipt(existingReceiptPath).catch(() => {});
            }
          }

          // Update expense with receipt_path if changed
          if (!receiptFailed && receiptPath !== (savedExpense.receipt_path ?? null)) {
            const updated = await dataService.updateExpense(
              { receipt_path: receiptPath },
              savedExpense.id,
            );
            receiptPath = updated.receipt_path ?? null;
          }
        }

        const finalExpense = { ...savedExpense, receipt_path: receiptPath };

        haptics.success();
        setExpenses((prev) =>
          expenseId
            ? prev.map((e) => (e.id === expenseId ? finalExpense : e))
            : [finalExpense, ...prev],
        );

        if (receiptFailed) {
          toast({
            variant: 'destructive',
            description: 'Expense saved but receipt upload failed',
          });
        } else {
          toast({
            variant: 'success',
            title: expenseId ? 'Expense updated' : 'Expense added',
          });
        }
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

      setCategories((prev) => [...prev, optimisticCategory]);

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
        setCategories((prev) =>
          prev.filter((c) => c.id !== optimisticCategory.id),
        );
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

        haptics.success();
        toast({
          variant: 'success',
          title: expenseId ? 'Recurring expense updated' : 'Recurring expense added',
        });
        setRecurringExpenses((prev) =>
          expenseId
            ? prev.map((e) => (e.id === expenseId ? savedExpense : e))
            : [savedExpense, ...prev],
        );
      } catch (error) {
        haptics.error();
        showErrorToast(
          `Failed to ${expenseId ? 'update' : 'add'} recurring expense`,
        );
        throw error;
      }
    },
    [isInitialized, setRecurringExpenses, showErrorToast, toast],
  );

  const handleRecurringExpenseDelete = useCallback(
    async (expenseId: string) => {
      if (!isInitialized) {
        return;
      }

      haptics.warning();

      // Optimistic delete
      setRecurringExpenses((prev) => prev.filter((e) => e.id !== expenseId));

      try {
        await dataService.deleteRecurringExpense(expenseId);
        haptics.success();
        // Refresh expenses to remove any orphaned generated expenses
        refreshExpenses().catch(() => {});
      } catch (error) {
        haptics.error();
        // Rollback — re-fetch to restore the deleted item
        refreshExpenses().catch(() => {});
        showErrorToast('Failed to delete recurring expense');
        throw error;
      }
    },
    [isInitialized, setRecurringExpenses, refreshExpenses, showErrorToast],
  );

  const handleRecurringExpenseToggle = useCallback(
    async (expenseId: string, active: boolean) => {
      if (!isInitialized) {
        return;
      }

      // Optimistic update
      setRecurringExpenses((prev) =>
        prev.map((e) => (e.id === expenseId ? { ...e, active } : e)),
      );

      try {
        const savedExpense = await dataService.toggleRecurringExpense(expenseId, active);
        haptics.success();
        setRecurringExpenses((prev) =>
          prev.map((e) => (e.id === expenseId ? savedExpense : e)),
        );
      } catch (error) {
        haptics.error();
        // Rollback on failure
        setRecurringExpenses((prev) =>
          prev.map((e) => (e.id === expenseId ? { ...e, active: !active } : e)),
        );
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

      setTags((prev) =>
        [...prev, optimisticTag].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );

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
        setTags((prev) =>
          prev.filter((t) => t.id !== optimisticTag.id),
        );
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
