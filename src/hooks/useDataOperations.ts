import { useCallback } from 'react';
import * as Sentry from '@sentry/react';
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
import { signOut } from '@/lib/auth';

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
    setIncomes,
    setCategories,
    setTags,
    setTemplates,
    setRecurringExpenses,
    setRecurringIncomes,
    refreshExpenses,
    refreshIncomes,
    monthlyBudget,
    setMonthlyBudget,
    defaultCurrency,
    setDefaultCurrency,
    defaultSavingsPct,
    setDefaultSavingsPct,
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
        Sentry.captureException(error, {
          tags: { operation: expenseId ? 'updateExpense' : 'createExpense' },
        });
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
          deleteReceipt(receiptPath).catch((err) => {
            Sentry.captureException(err, {
              tags: { operation: 'deleteReceipt', context: 'afterExpenseDelete' },
            });
          });
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
        Sentry.captureException(error, { tags: { operation: 'deleteExpense' } });
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
        Sentry.captureException(error, { tags: { operation: 'createCategory' } });
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
        Sentry.captureException(error, { tags: { operation: 'updateCategory' } });
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
        Sentry.captureException(error, { tags: { operation: 'deleteCategory' } });
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
        Sentry.captureException(error, {
          tags: {
            operation: expenseId
              ? 'updateRecurringExpense'
              : 'createRecurringExpense',
          },
        });
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
        refreshExpenses().catch((err) => {
          Sentry.captureException(err, {
            tags: {
              operation: 'refreshExpenses',
              context: 'afterRecurringExpenseDelete',
            },
          });
        });
      } catch (error) {
        haptics.error();
        // Rollback — re-fetch to restore the deleted item
        refreshExpenses().catch((err) => {
          Sentry.captureException(err, {
            tags: {
              operation: 'refreshExpenses',
              context: 'recurringExpenseDeleteRollback',
            },
          });
        });
        Sentry.captureException(error, {
          tags: { operation: 'deleteRecurringExpense' },
        });
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
        Sentry.captureException(error, {
          tags: { operation: 'toggleRecurringExpense' },
        });
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
        Sentry.captureException(error, { tags: { operation: 'createTag' } });
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
        Sentry.captureException(error, { tags: { operation: 'upsertBudget' } });
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
        Sentry.captureException(error, {
          tags: { operation: 'createCategoriesBulk' },
        });
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
        Sentry.captureException(error, {
          tags: { operation: 'updateDefaultCurrency' },
        });
        showErrorToast('Failed to update currency');
        throw error;
      }
    },
    [defaultCurrency, setDefaultCurrency, showErrorToast],
  );

  const handleSavingsPctUpdate = useCallback(
    async (pct: number | null) => {
      const previous = defaultSavingsPct;
      setDefaultSavingsPct(pct);

      try {
        await dataService.updateDefaultSavingsPct(pct);
      } catch (error) {
        haptics.error();
        setDefaultSavingsPct(previous);
        Sentry.captureException(error, {
          tags: { operation: 'updateDefaultSavingsPct' },
        });
        showErrorToast('Failed to update savings rate');
        throw error;
      }
    },
    [defaultSavingsPct, setDefaultSavingsPct, showErrorToast],
  );

  const handleDeleteAccount = useCallback(async () => {
    try {
      await dataService.deleteAccount();
      // Drop the (now-invalid) JWT so the route guard redirects to the landing
      // page. The auth user is already gone, so the server-side logout call
      // will 401 — supabase-js still clears local storage in that case.
      await signOut();
    } catch (error) {
      haptics.error();
      Sentry.captureException(error, { tags: { operation: 'deleteAccount' } });
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
        Sentry.captureException(error, {
          tags: { operation: 'createTemplate' },
        });
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
        Sentry.captureException(error, {
          tags: { operation: 'deleteTemplate' },
        });
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

  const handleIncomeSubmit = useCallback(
    async (
      incomeData: Partial<Expense>,
      incomeId?: string,
    ): Promise<Expense | null> => {
      if (!isInitialized) {
        return null;
      }

      try {
        const savedIncome = incomeId
          ? await dataService.updateIncome(incomeData, incomeId)
          : await dataService.createIncome(incomeData);

        haptics.success();
        setIncomes((prev) =>
          incomeId
            ? prev.map((e) => (e.id === incomeId ? savedIncome : e))
            : [savedIncome, ...prev],
        );
        toast({
          variant: 'success',
          title: incomeId ? 'Income updated' : 'Income added',
        });

        return savedIncome;
      } catch (error) {
        if (!navigator.onLine) {
          const mutationType = incomeId ? 'updateIncome' : 'createIncome';
          await offlineQueue.enqueue(mutationType, {
            ...incomeData,
            ...(incomeId ? { id: incomeId } : {}),
          } as Record<string, unknown>);
          haptics.success();
          toast({
            variant: 'success',
            title: 'Income queued',
            description: 'Will sync when back online',
          });

          return null;
        }
        haptics.error();
        Sentry.captureException(error, {
          tags: { operation: incomeId ? 'updateIncome' : 'createIncome' },
        });
        showErrorToast(`Failed to ${incomeId ? 'update' : 'add'} income`);
        throw error;
      }
    },
    [isInitialized, setIncomes, showErrorToast, toast],
  );

  const handleIncomeDelete = useCallback(
    async (incomeId: string) => {
      if (!isInitialized) {
        return;
      }

      haptics.warning();
      try {
        await dataService.deleteIncome(incomeId);
        setIncomes((prev) => prev.filter((e) => e.id !== incomeId));
      } catch (error) {
        if (!navigator.onLine) {
          await offlineQueue.enqueue('deleteIncome', { id: incomeId });
          haptics.success();
          toast({
            variant: 'success',
            title: 'Delete queued',
            description: 'Will sync when back online',
          });

          return;
        }
        haptics.error();
        Sentry.captureException(error, { tags: { operation: 'deleteIncome' } });
        showErrorToast('Failed to delete income');
        throw error;
      }
    },
    [isInitialized, setIncomes, showErrorToast, toast],
  );

  const handleRecurringIncomeSubmit = useCallback(
    async (incomeData: Partial<RecurringExpense>, incomeId?: string) => {
      if (!isInitialized) {
        return;
      }

      try {
        const saved = incomeId
          ? await dataService.updateRecurringIncome(incomeData, incomeId)
          : await dataService.createRecurringIncome(incomeData);

        haptics.success();
        toast({
          variant: 'success',
          title: incomeId
            ? 'Recurring income updated'
            : 'Recurring income added',
        });
        setRecurringIncomes((prev) =>
          incomeId
            ? prev.map((e) => (e.id === incomeId ? saved : e))
            : [saved, ...prev],
        );
      } catch (error) {
        haptics.error();
        Sentry.captureException(error, {
          tags: {
            operation: incomeId
              ? 'updateRecurringIncome'
              : 'createRecurringIncome',
          },
        });
        showErrorToast(
          `Failed to ${incomeId ? 'update' : 'add'} recurring income`,
        );
        throw error;
      }
    },
    [isInitialized, setRecurringIncomes, showErrorToast, toast],
  );

  const handleRecurringIncomeDelete = useCallback(
    async (incomeId: string) => {
      if (!isInitialized) {
        return;
      }

      haptics.warning();
      setRecurringIncomes((prev) => prev.filter((e) => e.id !== incomeId));

      try {
        await dataService.deleteRecurringIncome(incomeId);
        haptics.success();
        refreshIncomes().catch((err) => {
          Sentry.captureException(err, {
            tags: {
              operation: 'refreshIncomes',
              context: 'afterRecurringIncomeDelete',
            },
          });
        });
      } catch (error) {
        haptics.error();
        refreshIncomes().catch((err) => {
          Sentry.captureException(err, {
            tags: {
              operation: 'refreshIncomes',
              context: 'recurringIncomeDeleteRollback',
            },
          });
        });
        Sentry.captureException(error, {
          tags: { operation: 'deleteRecurringIncome' },
        });
        showErrorToast('Failed to delete recurring income');
        throw error;
      }
    },
    [isInitialized, setRecurringIncomes, refreshIncomes, showErrorToast],
  );

  const handleRecurringIncomeToggle = useCallback(
    async (incomeId: string, active: boolean) => {
      if (!isInitialized) {
        return;
      }

      setRecurringIncomes((prev) =>
        prev.map((e) => (e.id === incomeId ? { ...e, active } : e)),
      );

      try {
        const saved = await dataService.toggleRecurringIncome(incomeId, active);
        haptics.success();
        setRecurringIncomes((prev) =>
          prev.map((e) => (e.id === incomeId ? saved : e)),
        );
      } catch (error) {
        haptics.error();
        setRecurringIncomes((prev) =>
          prev.map((e) =>
            e.id === incomeId ? { ...e, active: !active } : e,
          ),
        );
        Sentry.captureException(error, {
          tags: { operation: 'toggleRecurringIncome' },
        });
        showErrorToast('Failed to update recurring income status');
        throw error;
      }
    },
    [isInitialized, setRecurringIncomes, showErrorToast],
  );

  return {
    handleExpenseSubmit,
    handleExpenseDelete,
    handleIncomeSubmit,
    handleIncomeDelete,
    handleCategoryAdd,
    handleCategoryUpdate,
    handleCategoryDelete,
    handleTagCreate,
    handleRecurringExpenseSubmit,
    handleRecurringExpenseDelete,
    handleRecurringExpenseToggle,
    handleRecurringIncomeSubmit,
    handleRecurringIncomeDelete,
    handleRecurringIncomeToggle,
    handleBudgetUpdate,
    handleCurrencyUpdate,
    handleSavingsPctUpdate,
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
        deleteReceipt(existingReceiptPath).catch((err) => {
          Sentry.captureException(err, {
            tags: { operation: 'deleteReceipt', context: 'afterReplaceUpload' },
          });
        });
      }
    } catch (error) {
      Sentry.captureException(error, { tags: { operation: 'uploadReceipt' } });
      receiptFailed = true;
    }
  } else if (removeExistingReceipt) {
    receiptPath = null;
    if (existingReceiptPath) {
      deleteReceipt(existingReceiptPath).catch((err) => {
        Sentry.captureException(err, {
          tags: { operation: 'deleteReceipt', context: 'removeExisting' },
        });
      });
    }
  }

  return { receiptPath, receiptFailed };
};
