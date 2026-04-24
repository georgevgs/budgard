import { useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { dataService } from '@/services/dataService';
import { useData } from '@/contexts/DataContext';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import type { RecurringExpense } from '@/types/RecurringExpense';
import type { Tag } from '@/types/Tag';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';
import { uploadReceipt, deleteReceipt } from '@/services/receiptService';
import { haptics } from '@/lib/haptics';
import { offlineQueue } from '@/lib/offlineQueue';

type BulkExpenseRow = {
  date: string;
  description: string;
  amount: number;
  category_id: string | null;
};

export type ReceiptOptions = {
  receiptFile: File | null;
  removeExistingReceipt: boolean;
  existingReceiptPath: string | null;
}

type ReceiptResult = {
  receiptPath: string | null;
  receiptFailed: boolean;
};

export function useDataOperations() {
  const {
    isInitialized,
    setExpenses,
    setCategories,
    setTags,
    setTemplates,
    setRecurringExpenses,
    refreshExpenses,
    monthlyBudget,
    setMonthlyBudget,
    defaultCurrency,
    setDefaultCurrency,
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

        let receiptPath = savedExpense.receipt_path ?? null;
        let receiptFailed = false;

        if (receiptOptions && expenseData.user_id) {
          ({ receiptPath, receiptFailed } = await processReceipt(
            savedExpense,
            receiptOptions,
            expenseData.user_id,
          ));

          if (
            !receiptFailed &&
            receiptPath !== (savedExpense.receipt_path ?? null)
          ) {
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
        if (!navigator.onLine) {
          const mutationType = expenseId ? 'updateExpense' : 'createExpense';
          await offlineQueue.enqueue(mutationType, {
            ...expenseData,
            ...(expenseId ? { id: expenseId } : {}),
          } as Record<string, unknown>);
          haptics.success();
          toast({
            variant: 'success',
            title: expenseId ? 'Expense queued' : 'Expense queued',
            description: 'Will sync when back online',
          });

          return;
        }
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
          receiptPath =
            prev.find((e) => e.id === expenseId)?.receipt_path ?? null;
          return prev.filter((e) => e.id !== expenseId);
        });

        // Fire-and-forget receipt cleanup
        if (receiptPath) {
          deleteReceipt(receiptPath).catch(() => {});
        }
      } catch (error) {
        if (!navigator.onLine) {
          await offlineQueue.enqueue('deleteExpense', { id: expenseId });
          haptics.success();
          toast({
            variant: 'success',
            title: 'Delete queued',
            description: 'Will sync when back online',
          });

          return;
        }
        haptics.error();
        showErrorToast('Failed to delete expense');
        throw error;
      }
    },
    [isInitialized, setExpenses, showErrorToast, toast],
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

  const handleCategoryUpdate = useCallback(
    async (categoryId: string, categoryData: Partial<Category>) => {
      if (!isInitialized) {
        return;
      }

      let previousCategories: Category[] = [];
      setCategories((prev) => {
        previousCategories = prev;

        return prev
          .map((c) => (c.id === categoryId ? { ...c, ...categoryData } : c))
          .sort((a, b) => a.name.localeCompare(b.name));
      });

      try {
        const saved = await dataService.updateCategory(
          categoryId,
          categoryData,
        );
        haptics.success();
        setCategories((prev) =>
          prev
            .map((c) => (c.id === categoryId ? saved : c))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      } catch (error) {
        haptics.error();
        setCategories(previousCategories);
        showErrorToast('Failed to update category');
        throw error;
      }
    },
    [isInitialized, setCategories, showErrorToast],
  );

  const handleCategoryDelete = useCallback(
    async (categoryId: string) => {
      if (!isInitialized) {
        return;
      }

      let previousCategories: Category[] = [];
      setCategories((prev) => {
        previousCategories = prev;

        return prev.filter((c) => c.id !== categoryId);
      });

      // Null out category on affected expenses
      setExpenses((prev) =>
        prev.map((e) =>
          e.category_id === categoryId
            ? { ...e, category_id: undefined, category: undefined }
            : e,
        ),
      );

      try {
        await dataService.deleteCategory(categoryId);
        haptics.success();
      } catch (error) {
        haptics.error();
        setCategories(previousCategories);
        refreshExpenses();
        showErrorToast('Failed to delete category');
        throw error;
      }
    },
    [isInitialized, setCategories, setExpenses, refreshExpenses, showErrorToast],
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
          title: expenseId
            ? 'Recurring expense updated'
            : 'Recurring expense added',
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
        const savedExpense = await dataService.toggleRecurringExpense(
          expenseId,
          active,
        );
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
        [...prev, optimisticTag].sort((a, b) => a.name.localeCompare(b.name)),
      );

      try {
        const savedTag = await dataService.createTag({ name, color });
        haptics.success();
        setTags((prev) =>
          [...prev.filter((t) => t.id !== optimisticTag.id), savedTag].sort(
            (a, b) => a.name.localeCompare(b.name),
          ),
        );
        return savedTag;
      } catch (error) {
        haptics.error();
        setTags((prev) => prev.filter((t) => t.id !== optimisticTag.id));
        showErrorToast('Failed to create tag');
        throw error;
      }
    },
    [setTags, showErrorToast],
  );

  const handleBudgetUpdate = useCallback(
    async (amount: number) => {
      const previousBudget = monthlyBudget;
      setMonthlyBudget(amount);

      try {
        await dataService.upsertBudget(amount);
      } catch (error) {
        haptics.error();
        setMonthlyBudget(previousBudget);
        showErrorToast('Failed to update budget');
        throw error;
      }
    },
    [monthlyBudget, setMonthlyBudget, showErrorToast],
  );

  const handleCategoriesAddBulk = useCallback(
    async (categoriesData: Partial<Category>[]) => {
      if (!isInitialized) return;

      try {
        const created = await Promise.all(
          categoriesData.map((cat) => dataService.createCategory(cat)),
        );
        haptics.success();
        setCategories((prev) =>
          [...prev, ...created].sort((a, b) => a.name.localeCompare(b.name)),
        );
      } catch (error) {
        haptics.error();
        showErrorToast('Failed to create categories');
        throw error;
      }
    },
    [isInitialized, setCategories, showErrorToast],
  );

  const handleCurrencyUpdate = useCallback(
    async (currency: string) => {
      const previousCurrency = defaultCurrency;
      setDefaultCurrency(currency);

      try {
        await dataService.updateDefaultCurrency(currency);
      } catch (error) {
        haptics.error();
        setDefaultCurrency(previousCurrency);
        showErrorToast('Failed to update currency');
        throw error;
      }
    },
    [defaultCurrency, setDefaultCurrency, showErrorToast],
  );

  const handleDeleteAccount = useCallback(async () => {
    try {
      await dataService.deleteAccount();
    } catch (error) {
      haptics.error();
      showErrorToast('Failed to delete account');
      throw error;
    }
  }, [showErrorToast]);

  const handleTemplateCreate = useCallback(
    async (templateData: Partial<ExpenseTemplate>) => {
      if (!isInitialized) return;

      const optimisticTemplate = {
        ...templateData,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
      } as ExpenseTemplate;

      setTemplates((prev) => [optimisticTemplate, ...prev]);

      try {
        const saved = await dataService.createTemplate(templateData);
        haptics.success();
        setTemplates((prev) =>
          prev.map((t) => (t.id === optimisticTemplate.id ? saved : t)),
        );
        toast({ variant: 'success', title: 'Template saved' });
      } catch (error) {
        haptics.error();
        setTemplates((prev) =>
          prev.filter((t) => t.id !== optimisticTemplate.id),
        );
        showErrorToast('Failed to save template');
        throw error;
      }
    },
    [isInitialized, setTemplates, showErrorToast, toast],
  );

  const handleTemplateDelete = useCallback(
    async (templateId: string) => {
      if (!isInitialized) return;

      haptics.warning();
      let previousTemplates: ExpenseTemplate[] = [];
      setTemplates((prev) => {
        previousTemplates = prev;

        return prev.filter((t) => t.id !== templateId);
      });

      try {
        await dataService.deleteTemplate(templateId);
        haptics.success();
      } catch (error) {
        haptics.error();
        setTemplates(previousTemplates);
        showErrorToast('Failed to delete template');
        throw error;
      }
    },
    [isInitialized, setTemplates, showErrorToast],
  );

  const handleBulkExpenseImport = useCallback(
    async (expensesData: BulkExpenseRow[]) => {
      if (!isInitialized) return;

      await dataService.createExpensesBulk(expensesData);
      await refreshExpenses();
    },
    [isInitialized, refreshExpenses],
  );

  return {
    handleExpenseSubmit,
    handleExpenseDelete,
    handleCategoryAdd,
    handleCategoryUpdate,
    handleCategoryDelete,
    handleTagCreate,
    handleRecurringExpenseSubmit,
    handleRecurringExpenseDelete,
    handleRecurringExpenseToggle,
    handleBudgetUpdate,
    handleCurrencyUpdate,
    handleDeleteAccount,
    handleCategoriesAddBulk,
    handleBulkExpenseImport,
    handleTemplateCreate,
    handleTemplateDelete,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Upload new receipt first, then remove old one to prevent data loss.
const processReceipt = async (
  savedExpense: Expense,
  receiptOptions: ReceiptOptions,
  userId: string,
): Promise<ReceiptResult> => {
  const { receiptFile, removeExistingReceipt, existingReceiptPath } =
    receiptOptions;
  let receiptPath = savedExpense.receipt_path ?? null;
  let receiptFailed = false;

  if (receiptFile) {
    try {
      receiptPath = await uploadReceipt(receiptFile, userId, savedExpense.id);
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

  return { receiptPath, receiptFailed };
};
