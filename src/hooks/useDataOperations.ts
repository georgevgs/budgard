import { useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import { useToast } from '@/hooks/useToast';
import { dataService } from '@/services/dataService';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import type { RecurringExpense } from '@/types/RecurringExpense';
import type { Tag } from '@/types/Tag';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';
import type { Goal } from '@/types/Goal';
import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';
import type { Debt } from '@/types/Debt';
import type { CategoryBudget } from '@/types/CategoryBudget';
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

export const useDataOperations = () => {
  const {
    isInitialized,
    monthlyBudget,
    defaultCurrency,
    defaultSavingsPct,
    dailyReminderHour,
  } = useDataConfig();
  const {
    setExpenses,
    setIncomes,
    setCategories,
    setTags,
    setTemplates,
    setGoals,
    setRecurringExpenses,
    setRecurringIncomes,
    setAccounts,
    setAccountBalances,
    setDebts,
    setCategoryBudgets,
    refreshExpenses,
    refreshIncomes,
    refreshAccounts,
    refreshDebts,
    setMonthlyBudget,
    setDefaultCurrency,
    setDefaultSavingsPct,
    setDailyReminderHour,
    expensesRef,
  } = useDataActions();
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
        let oldPathToDelete: string | null = null;

        if (receiptOptions && expenseData.user_id) {
          let uploadedNewPath: string | null = null;
          ({
            receiptPath,
            receiptFailed,
            uploadedNewPath,
            oldPathToDelete,
          } = await processReceipt(
            savedExpense,
            receiptOptions,
            expenseData.user_id,
          ));

          if (
            !receiptFailed &&
            receiptPath !== (savedExpense.receipt_path ?? null)
          ) {
            try {
              const updated = await dataService.updateExpense(
                { receipt_path: receiptPath },
                savedExpense.id,
              );
              receiptPath = updated.receipt_path ?? null;
            } catch (err) {
              // The expense row didn't get pointed at the new file — roll
              // back the upload so it doesn't orphan in storage. Don't
              // delete the old file: the row still references it.
              if (uploadedNewPath) {
                deleteReceipt(uploadedNewPath).catch((cleanupErr) => {
                  Sentry.captureException(cleanupErr, {
                    tags: {
                      operation: 'deleteReceipt',
                      context: 'rollbackAfterReceiptUpdateFail',
                    },
                  });
                });
              }
              throw err;
            }
          }
        }

        // Safe to drop the previous receipt now: the row points at the new
        // path (or null, on explicit removal).
        if (oldPathToDelete) {
          deleteReceipt(oldPathToDelete).catch((err) => {
            Sentry.captureException(err, {
              tags: {
                operation: 'deleteReceipt',
                context: 'afterReceiptUpdateSuccess',
              },
            });
          });
        }

        const finalExpense = { ...savedExpense, receipt_path: receiptPath };

        haptics.success();

        const previousDebtId = expenseId
          ? expensesRef.current.find((e) => e.id === expenseId)?.debt_id ?? null
          : null;
        setExpenses((prev) => {
          if (expenseId) {
            return prev.map((e) => (e.id === expenseId ? finalExpense : e));
          }

          return [finalExpense, ...prev];
        });

        // The DB trigger recomputes debts.current_balance whenever a payment
        // is written. Refresh debts on the client if either the saved row
        // or the row it replaced is linked to a debt.
        if (finalExpense.debt_id || previousDebtId) {
          refreshDebts().catch((err) => {
            Sentry.captureException(err, {
              tags: { context: 'afterExpenseSubmitDebt' },
            });
          });
        }

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
          // Stash a temp id on creates so a subsequent offline delete can
          // cancel the pending insert instead of leaving a server ghost.
          const tempId = expenseId ? null : `temp-${Date.now()}`;
          await offlineQueue.enqueue(mutationType, {
            ...expenseData,
            ...(expenseId ? { id: expenseId } : { __tempId: tempId }),
          } as Record<string, unknown>);
          // Reflect the queued change locally; useOfflineSync will refresh
          // from the server once the queue drains.
          setExpenses((prev) => {
            if (expenseId) {
              return prev.map((e) =>
                e.id === expenseId ? ({ ...e, ...expenseData } as Expense) : e,
              );
            }
            const optimistic = {
              ...expenseData,
              id: tempId as string,
              created_at: new Date().toISOString(),
            } as Expense;

            return [optimistic, ...prev];
          });
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
    [isInitialized, setExpenses, refreshDebts, showErrorToast, toast],
  );

  const handleExpenseDelete = useCallback(
    async (expenseId: string) => {
      if (!isInitialized) {
        return;
      }

      haptics.warning();
      // Snapshot before delete so receipt cleanup and debt refresh work even
      // if a concurrent setter races us out of the row.
      const existing = expensesRef.current.find((e) => e.id === expenseId);
      const receiptPath = existing?.receipt_path ?? null;
      const deletedDebtId = existing?.debt_id ?? null;
      try {
        await dataService.deleteExpense(expenseId);

        setExpenses((prev) => prev.filter((e) => e.id !== expenseId));

        if (deletedDebtId) {
          refreshDebts().catch((err) => {
            Sentry.captureException(err, {
              tags: { context: 'afterExpenseDeleteDebt' },
            });
          });
        }

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
          // If we're deleting an expense that only exists as a queued
          // offline create, cancel the create instead of enqueuing a delete
          // — otherwise the create replays on reconnect and the server keeps
          // a ghost row that the (temp-id) delete cannot reach.
          if (expenseId.startsWith('temp-')) {
            const queued = await offlineQueue.getAll();
            const pendingCreate = queued.find(
              (m) =>
                m.type === 'createExpense' && m.payload.__tempId === expenseId,
            );
            if (pendingCreate) {
              await offlineQueue.remove(pendingCreate.id);
            }
          } else {
            await offlineQueue.enqueue('deleteExpense', { id: expenseId });
          }
          setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
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
    [isInitialized, setExpenses, refreshDebts, showErrorToast, toast],
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

      // Each Expense carries an embedded `category` object (populated via the
      // Supabase join at fetch time). ExpensesCard / MonthDrillDown read
      // expense.category.{name,icon,color} directly, so the categories-list
      // change alone leaves the cards stale until the next full refresh.
      let previousExpenses: Expense[] = [];
      let previousIncomes: Expense[] = [];
      setExpenses((prev) => {
        previousExpenses = prev;

        return prev.map((e) =>
          e.category_id === categoryId && e.category
            ? { ...e, category: { ...e.category, ...categoryData } }
            : e,
        );
      });
      setIncomes((prev) => {
        previousIncomes = prev;

        return prev.map((i) =>
          i.category_id === categoryId && i.category
            ? { ...i, category: { ...i.category, ...categoryData } }
            : i,
        );
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
        setExpenses((prev) =>
          prev.map((e) =>
            e.category_id === categoryId ? { ...e, category: saved } : e,
          ),
        );
        setIncomes((prev) =>
          prev.map((i) =>
            i.category_id === categoryId ? { ...i, category: saved } : i,
          ),
        );
      } catch (error) {
        haptics.error();
        setCategories(previousCategories);
        setExpenses(previousExpenses);
        setIncomes(previousIncomes);
        Sentry.captureException(error, { tags: { operation: 'updateCategory' } });
        showErrorToast('Failed to update category');
        throw error;
      }
    },
    [isInitialized, setCategories, setExpenses, setIncomes, showErrorToast],
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

      // The DB drops category_budgets rows via ON DELETE CASCADE — keep local
      // cache in sync so the budgets UI doesn't reference a missing category.
      let previousBudgets: CategoryBudget[] = [];
      setCategoryBudgets((prev) => {
        previousBudgets = prev;

        return prev.filter((b) => b.category_id !== categoryId);
      });

      try {
        await dataService.deleteCategory(categoryId);
        haptics.success();
      } catch (error) {
        haptics.error();
        setCategories(previousCategories);
        setCategoryBudgets(previousBudgets);
        refreshExpenses();
        Sentry.captureException(error, { tags: { operation: 'deleteCategory' } });
        showErrorToast('Failed to delete category');
        throw error;
      }
    },
    [
      isInitialized,
      setCategories,
      setExpenses,
      setCategoryBudgets,
      refreshExpenses,
      showErrorToast,
    ],
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

      // Snapshot for rollback — refreshExpenses() refetches `expenses`, not
      // `recurringExpenses`, so we must restore the latter from this snapshot.
      let previousRecurring: RecurringExpense[] = [];
      setRecurringExpenses((prev) => {
        previousRecurring = prev;

        return prev.filter((e) => e.id !== expenseId);
      });

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
        setRecurringExpenses(previousRecurring);
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

  const handleCategoryBudgetUpsert = useCallback(
    async (categoryId: string, amount: number) => {
      if (!isInitialized) return;

      let previousBudgets: CategoryBudget[] = [];
      const optimisticBudget: CategoryBudget = {
        id: `temp-${Date.now()}`,
        user_id: '',
        category_id: categoryId,
        monthly_amount: amount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCategoryBudgets((prev) => {
        previousBudgets = prev;
        const existing = prev.find((b) => b.category_id === categoryId);
        if (existing) {
          return prev.map((b) =>
            b.category_id === categoryId
              ? { ...b, monthly_amount: amount }
              : b,
          );
        }

        return [...prev, optimisticBudget];
      });

      try {
        const saved = await dataService.upsertCategoryBudget(
          categoryId,
          amount,
        );
        haptics.success();
        setCategoryBudgets((prev) => {
          const filtered = prev.filter(
            (b) =>
              b.category_id !== categoryId && b.id !== optimisticBudget.id,
          );

          return [...filtered, saved];
        });
      } catch (error) {
        haptics.error();
        setCategoryBudgets(previousBudgets);
        Sentry.captureException(error, {
          tags: { operation: 'upsertCategoryBudget' },
        });
        showErrorToast('Failed to update category budget');
        throw error;
      }
    },
    [isInitialized, setCategoryBudgets, showErrorToast],
  );

  const handleCategoryBudgetDelete = useCallback(
    async (categoryId: string) => {
      if (!isInitialized) return;

      let previousBudgets: CategoryBudget[] = [];
      setCategoryBudgets((prev) => {
        previousBudgets = prev;

        return prev.filter((b) => b.category_id !== categoryId);
      });

      try {
        await dataService.deleteCategoryBudget(categoryId);
        haptics.success();
      } catch (error) {
        haptics.error();
        setCategoryBudgets(previousBudgets);
        Sentry.captureException(error, {
          tags: { operation: 'deleteCategoryBudget' },
        });
        showErrorToast('Failed to remove category budget');
        throw error;
      }
    },
    [isInitialized, setCategoryBudgets, showErrorToast],
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

  const handleDailyReminderHourUpdate = useCallback(
    async (hour: number | null) => {
      const previous = dailyReminderHour;
      setDailyReminderHour(hour);

      try {
        await dataService.updateDailyReminderHour(hour);
      } catch (error) {
        haptics.error();
        setDailyReminderHour(previous);
        Sentry.captureException(error, {
          tags: { operation: 'updateDailyReminderHour' },
        });
        showErrorToast('Failed to update daily reminder');
        throw error;
      }
    },
    [dailyReminderHour, setDailyReminderHour, showErrorToast],
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

  const handleGoalCreate = useCallback(
    async (goalData: Partial<Goal>) => {
      if (!isInitialized) return;

      const optimisticGoal = {
        ...goalData,
        id: `temp-${Date.now()}`,
        is_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Goal;

      setGoals((prev) => [optimisticGoal, ...prev]);

      try {
        const saved = await dataService.createGoal(goalData);
        haptics.success();
        setGoals((prev) =>
          prev.map((g) => (g.id === optimisticGoal.id ? saved : g)),
        );
        toast({ variant: 'success', title: 'Goal created' });
      } catch (error) {
        haptics.error();
        setGoals((prev) => prev.filter((g) => g.id !== optimisticGoal.id));
        Sentry.captureException(error, { tags: { operation: 'createGoal' } });
        showErrorToast('Failed to create goal');
        throw error;
      }
    },
    [isInitialized, setGoals, showErrorToast, toast],
  );

  const handleGoalUpdate = useCallback(
    async (goalId: string, goalData: Partial<Goal>) => {
      if (!isInitialized) return;

      let previousGoals: Goal[] = [];
      setGoals((prev) => {
        previousGoals = prev;

        return prev.map((g) =>
          g.id === goalId ? ({ ...g, ...goalData } as Goal) : g,
        );
      });

      try {
        const saved = await dataService.updateGoal(goalId, goalData);
        haptics.success();
        setGoals((prev) => prev.map((g) => (g.id === goalId ? saved : g)));
      } catch (error) {
        haptics.error();
        setGoals(previousGoals);
        Sentry.captureException(error, { tags: { operation: 'updateGoal' } });
        showErrorToast('Failed to update goal');
        throw error;
      }
    },
    [isInitialized, setGoals, showErrorToast],
  );

  const handleGoalDelete = useCallback(
    async (goalId: string) => {
      if (!isInitialized) return;

      haptics.warning();
      let previousGoals: Goal[] = [];
      setGoals((prev) => {
        previousGoals = prev;

        return prev.filter((g) => g.id !== goalId);
      });

      try {
        await dataService.deleteGoal(goalId);
        haptics.success();
      } catch (error) {
        haptics.error();
        setGoals(previousGoals);
        Sentry.captureException(error, { tags: { operation: 'deleteGoal' } });
        showErrorToast('Failed to delete goal');
        throw error;
      }
    },
    [isInitialized, setGoals, showErrorToast],
  );

  const handleAccountSubmit = useCallback(
    async (
      accountData: Partial<Account> & { initial_balance?: number },
      accountId?: string,
    ): Promise<Account | null> => {
      if (!isInitialized) return null;

      try {
        const saved = accountId
          ? await dataService.updateAccount(accountId, accountData)
          : await dataService.createAccount(accountData);

        haptics.success();
        setAccounts((prev) =>
          accountId
            ? prev.map((a) => (a.id === accountId ? saved : a))
            : [...prev, saved],
        );

        // Creating an account seeds an opening snapshot — refresh balances so
        // the chart and detail sheet pick it up without a full reload.
        if (!accountId) {
          refreshAccounts().catch((err) => {
            Sentry.captureException(err, {
              tags: { context: 'afterAccountCreate' },
            });
          });
        }

        toast({
          variant: 'success',
          title: accountId ? 'Account updated' : 'Account added',
        });

        return saved;
      } catch (error) {
        haptics.error();
        Sentry.captureException(error, {
          tags: { operation: accountId ? 'updateAccount' : 'createAccount' },
        });
        showErrorToast(`Failed to ${accountId ? 'update' : 'add'} account`);
        throw error;
      }
    },
    [isInitialized, setAccounts, refreshAccounts, showErrorToast, toast],
  );

  const handleAccountArchive = useCallback(
    async (accountId: string) => {
      if (!isInitialized) return;

      haptics.warning();
      let previousAccounts: Account[] = [];
      setAccounts((prev) => {
        previousAccounts = prev;

        return prev.filter((a) => a.id !== accountId);
      });

      try {
        await dataService.archiveAccount(accountId);
        haptics.success();
      } catch (error) {
        haptics.error();
        setAccounts(previousAccounts);
        Sentry.captureException(error, {
          tags: { operation: 'archiveAccount' },
        });
        showErrorToast('Failed to archive account');
        throw error;
      }
    },
    [isInitialized, setAccounts, showErrorToast],
  );

  const handleSnapshotCreate = useCallback(
    async (snapshot: Partial<AccountBalance>) => {
      if (!isInitialized) return null;

      try {
        const saved = await dataService.upsertAccountBalance(snapshot);
        haptics.success();

        // The DB trigger updated current_balance / cost_basis. Refetch the
        // account row + replace the snapshot in local state.
        const accountId = saved.account_id;
        const updatedAccount = await dataService.getAccountById(accountId);

        setAccountBalances((prev) => {
          // Upsert: replace any existing snapshot for the same (account, date).
          const filtered = prev.filter(
            (b) =>
              !(b.account_id === accountId && b.recorded_at === saved.recorded_at),
          );
          return [...filtered, saved].sort((a, b) =>
            a.recorded_at.localeCompare(b.recorded_at),
          );
        });
        setAccounts((prev) =>
          prev.map((a) => (a.id === accountId ? updatedAccount : a)),
        );

        toast({ variant: 'success', title: 'Balance updated' });
        return saved;
      } catch (error) {
        haptics.error();
        Sentry.captureException(error, {
          tags: { operation: 'createAccountBalance' },
        });
        showErrorToast('Failed to update balance');
        throw error;
      }
    },
    [isInitialized, setAccounts, setAccountBalances, showErrorToast, toast],
  );

  const handleSnapshotDelete = useCallback(
    async (snapshotId: string, accountId: string) => {
      if (!isInitialized) return;

      haptics.warning();
      let previousBalances: AccountBalance[] = [];
      setAccountBalances((prev) => {
        previousBalances = prev;

        return prev.filter((b) => b.id !== snapshotId);
      });

      try {
        await dataService.deleteAccountBalance(snapshotId);
        const updatedAccount = await dataService.getAccountById(accountId);
        setAccounts((prev) =>
          prev.map((a) => (a.id === accountId ? updatedAccount : a)),
        );
        haptics.success();
      } catch (error) {
        haptics.error();
        setAccountBalances(previousBalances);
        Sentry.captureException(error, {
          tags: { operation: 'deleteAccountBalance' },
        });
        showErrorToast('Failed to delete snapshot');
        throw error;
      }
    },
    [isInitialized, setAccounts, setAccountBalances, showErrorToast],
  );

  const handleDebtSubmit = useCallback(
    async (
      debtData: Partial<Debt>,
      debtId?: string,
    ): Promise<Debt | null> => {
      if (!isInitialized) return null;

      try {
        const saved = debtId
          ? await dataService.updateDebt(debtId, debtData)
          : await dataService.createDebt(debtData);

        haptics.success();
        setDebts((prev) =>
          debtId
            ? prev.map((d) => (d.id === debtId ? saved : d))
            : [...prev, saved],
        );

        toast({
          variant: 'success',
          title: debtId ? 'Debt updated' : 'Debt added',
        });

        return saved;
      } catch (error) {
        haptics.error();
        Sentry.captureException(error, {
          tags: { operation: debtId ? 'updateDebt' : 'createDebt' },
        });
        showErrorToast(`Failed to ${debtId ? 'update' : 'add'} debt`);
        throw error;
      }
    },
    [isInitialized, setDebts, showErrorToast, toast],
  );

  const handleDebtArchive = useCallback(
    async (debtId: string) => {
      if (!isInitialized) return;

      haptics.warning();
      let previousDebts: Debt[] = [];
      setDebts((prev) => {
        previousDebts = prev;

        return prev.filter((d) => d.id !== debtId);
      });

      try {
        await dataService.archiveDebt(debtId);
        haptics.success();
      } catch (error) {
        haptics.error();
        setDebts(previousDebts);
        Sentry.captureException(error, {
          tags: { operation: 'archiveDebt' },
        });
        showErrorToast('Failed to archive debt');
        throw error;
      }
    },
    [isInitialized, setDebts, showErrorToast],
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
          setIncomes((prev) => {
            if (incomeId) {
              return prev.map((e) =>
                e.id === incomeId ? ({ ...e, ...incomeData } as Expense) : e,
              );
            }
            const optimistic = {
              ...incomeData,
              id: `temp-${Date.now()}`,
              created_at: new Date().toISOString(),
            } as Expense;

            return [optimistic, ...prev];
          });
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
          setIncomes((prev) => prev.filter((e) => e.id !== incomeId));
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

      // Snapshot for rollback — refreshIncomes() refetches the `incomes`
      // list, not `recurringIncomes`, so we restore the latter here.
      let previousRecurring: RecurringExpense[] = [];
      setRecurringIncomes((prev) => {
        previousRecurring = prev;

        return prev.filter((e) => e.id !== incomeId);
      });

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
        setRecurringIncomes(previousRecurring);
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

  // Memoize the return object so consumers passing the whole `operations`
  // value into useCallback/useEffect deps don't get a fresh reference every
  // parent render. Each handler is already stable via useCallback above.
  return useMemo(
    () => ({
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
      handleCategoryBudgetUpsert,
      handleCategoryBudgetDelete,
      handleCurrencyUpdate,
      handleSavingsPctUpdate,
      handleDailyReminderHourUpdate,
      handleDeleteAccount,
      handleCategoriesAddBulk,
      handleBulkExpenseImport,
      handleTemplateCreate,
      handleTemplateDelete,
      handleGoalCreate,
      handleGoalUpdate,
      handleGoalDelete,
      handleAccountSubmit,
      handleAccountArchive,
      handleSnapshotCreate,
      handleSnapshotDelete,
      handleDebtSubmit,
      handleDebtArchive,
    }),
    [
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
      handleCategoryBudgetUpsert,
      handleCategoryBudgetDelete,
      handleCurrencyUpdate,
      handleSavingsPctUpdate,
      handleDailyReminderHourUpdate,
      handleDeleteAccount,
      handleCategoriesAddBulk,
      handleBulkExpenseImport,
      handleTemplateCreate,
      handleTemplateDelete,
      handleGoalCreate,
      handleGoalUpdate,
      handleGoalDelete,
      handleAccountSubmit,
      handleAccountArchive,
      handleSnapshotCreate,
      handleSnapshotDelete,
      handleDebtSubmit,
      handleDebtArchive,
    ],
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Uploads a new receipt (or signals removal of the existing one) but does NOT
// touch the prior file in storage — the caller deletes it only after the
// expense row has been pointed at the new path. uploadedNewPath lets the
// caller roll back the upload if the subsequent DB write fails.
const processReceipt = async (
  savedExpense: Expense,
  receiptOptions: ReceiptOptions,
  userId: string,
): Promise<
  ReceiptResult & {
    uploadedNewPath: string | null;
    oldPathToDelete: string | null;
  }
> => {
  const { receiptFile, removeExistingReceipt, existingReceiptPath } =
    receiptOptions;
  let receiptPath = savedExpense.receipt_path ?? null;
  let receiptFailed = false;
  let uploadedNewPath: string | null = null;
  let oldPathToDelete: string | null = null;

  if (receiptFile) {
    try {
      receiptPath = await uploadReceipt(receiptFile, userId, savedExpense.id);
      uploadedNewPath = receiptPath;
      if (existingReceiptPath) {
        oldPathToDelete = existingReceiptPath;
      }
    } catch (error) {
      Sentry.captureException(error, { tags: { operation: 'uploadReceipt' } });
      receiptFailed = true;
    }
  } else if (removeExistingReceipt) {
    receiptPath = null;
    if (existingReceiptPath) {
      oldPathToDelete = existingReceiptPath;
    }
  }

  return { receiptPath, receiptFailed, uploadedNewPath, oldPathToDelete };
};
