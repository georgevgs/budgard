import { useMemo } from 'react';
import * as Sentry from '@/lib/sentry';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/useToast';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import type { ExpenseWritePayload } from '@/services/dataService';
import { uploadReceipt, deleteReceipt } from '@/services/receiptService';
import { haptics } from '@/lib/haptics';
import { offlineQueue, createTempId } from '@/lib/offlineQueue';
import { isOfflineError } from '@/lib/offlineError';
import type { Expense } from '@/types/Expense';
import { replaceById, patchById, pickByEdit } from '@/hooks/dataOps/helpers';
import { mergeUniqueById } from '@/contexts/DataContext.helpers';
import { useMutationRunner } from '@/hooks/dataOps/useMutationRunner';
import { useFinancialSpace } from '@/contexts/FinancialSpaceContext';
import { recurringSuggestionService } from '@/services/recurringSuggestionService';

export type ReceiptOptions = {
  receiptFile: File | null;
  removeExistingReceipt: boolean;
  existingReceiptPath: string | null;
};

export type SplitPart = {
  amount: number;
  category_id: string | null;
};

type BulkExpenseRow = {
  date: string;
  description: string;
  amount: number;
  category_id: string | null;
};

export const useExpenseOps = () => {
  const { activeOwnerId } = useFinancialSpace();
  const { isInitialized } = useDataConfig();
  const { setExpenses, refreshDebts, refreshExpenses, expensesRef } =
    useDataActions();
  const { toast } = useToast();
  const { t } = useTranslation();
  const runMutation = useMutationRunner();

  return useMemo(() => {
    const skip = !isInitialized;

    const refreshDebtsQuietly = () => {
      refreshDebts().catch((err) => {
        Sentry.captureException(err, {
          tags: { context: 'afterExpenseSubmitDebt' },
        });
      });
    };

    // Server-first: an expense row carries server-derived columns and a
    // receipt path that only exists once the upload lands.
    const handleExpenseSubmit = async (
      expenseData: ExpenseWritePayload,
      expenseId?: string,
      receiptOptions?: ReceiptOptions,
    ): Promise<void> => {
      const previousDebtId = getPreviousDebtId(expenseId, expensesRef.current);

      await runMutation({
        operation: pickByEdit(expenseId, 'updateExpense', 'createExpense'),
        skip,
        errorMessage: pickByEdit(
          expenseId,
          t('expenses.toasts.updateFailed'),
          t('expenses.toasts.addFailed'),
        ),
        offlineFallback: async (error) => {
          if (!isOfflineError(error)) return false;

          await queueExpenseOffline(
            expenseData,
            expenseId,
            activeOwnerId,
            setExpenses,
          );
          haptics.success();
          toast({
            variant: 'success',
            title: t('offline.savedOffline'),
            description: t('offline.willSync'),
          });

          return true;
        },
        perform: async () => {
          let savedExpense: Expense;
          if (expenseId) {
            savedExpense = await dataService.updateExpense(
              expenseData,
              expenseId,
            );
          } else {
            savedExpense = await dataService.createExpense(
              expenseData,
              activeOwnerId,
            );
          }

          const { receiptPath, receiptFailed, oldPathToDelete } =
            await settleReceipt(savedExpense, receiptOptions);

          if (oldPathToDelete) {
            deleteReceiptQuietly(oldPathToDelete, 'afterReceiptUpdateSuccess');
          }

          return {
            finalExpense: { ...savedExpense, receipt_path: receiptPath },
            receiptFailed,
          };
        },
        commit: ({ finalExpense, receiptFailed }) => {
          const isDebtPayment = finalExpense.type === 'debt_payment';
          setExpenses((prev) => {
            if (expenseId) {
              if (isDebtPayment) return prev.filter((e) => e.id !== expenseId);

              return replaceById(prev, expenseId, finalExpense);
            }

            if (isDebtPayment) return prev;

            return [finalExpense, ...prev];
          });

          if (finalExpense.debt_id || previousDebtId) {
            refreshDebtsQuietly();
          }

          // Not `successMessage`: the expense saved either way, but a failed
          // receipt has to say so rather than claim a clean save.
          if (receiptFailed) {
            toast({
              variant: 'destructive',
              description: t('expenses.toasts.receiptUploadFailed'),
            });

            return;
          }

          toast({
            variant: 'success',
            title: pickByEdit(
              expenseId,
              t('expenses.toasts.updated'),
              t('expenses.toasts.added'),
            ),
          });
        },
      });
    };

    // The row is removed once the delete lands, not before — a failed delete
    // that already emptied the row would read as data loss.
    const handleExpenseDelete = (expenseId: string) => {
      const existing = expensesRef.current.find((e) => e.id === expenseId);
      const receiptPath = existing?.receipt_path ?? null;
      const deletedDebtId = existing?.debt_id ?? null;

      return runMutation({
        operation: 'deleteExpense',
        skip,
        errorMessage: t('expenses.toasts.deleteFailed'),
        onStart: () => haptics.warning(),
        successHaptic: 'none',
        offlineFallback: async (error) => {
          if (!isOfflineError(error)) return false;

          await offlineQueue.enqueueWithReconcile('deleteExpense', {
            id: expenseId,
          });
          setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
          haptics.success();
          toast({
            variant: 'success',
            title: t('offline.deleteSavedOffline'),
            description: t('offline.willSync'),
          });

          return true;
        },
        perform: () => dataService.deleteExpense(expenseId),
        commit: () => {
          setExpenses((prev) => prev.filter((e) => e.id !== expenseId));

          if (deletedDebtId) {
            refreshDebts().catch((err) => {
              Sentry.captureException(err, {
                tags: { context: 'afterExpenseDeleteDebt' },
              });
            });
          }

          if (receiptPath) {
            deleteReceiptQuietly(receiptPath, 'afterExpenseDelete');
          }
        },
      });
    };

    // The insert returns the created rows with their embeds, so merging them
    // into state replaces a full-history re-download. Consumers sort before
    // display, so append order doesn't matter.
    const handleBulkExpenseImport = async (expensesData: BulkExpenseRow[]) => {
      if (skip) return;

      const created = await dataService.createExpensesBulk(
        expensesData,
        activeOwnerId,
        'import',
      );
      setExpenses((prev) => mergeUniqueById(prev, created));
      const reconciled = await recurringSuggestionService.reconcile(
        activeOwnerId,
      );
      if (reconciled > 0) {
        await refreshExpenses();
      }
    };

    // Splits one expense into several: the original row keeps its receipt and
    // recurring link and takes the first part; the rest are new rows with the
    // same date, description, tag, note and exclusion state.
    //
    // The new rows are written FIRST and the original is shrunk last. The
    // other order shrinks the original and then, if the insert fails, leaves
    // the remainder existing nowhere — €120 split three ways became a single
    // €40 row with an error toast. Written this way the worst case is a
    // duplicate set of parts alongside an intact original, which is visible
    // and correctable, rather than money that is simply gone.
    const handleExpenseSplit = (expense: Expense, parts: SplitPart[]) => {
      const [firstPart, ...restParts] = parts;

      return runMutation({
        operation: 'splitExpense',
        skip: skip || parts.length < 2,
        errorMessage: t('expenses.split.failed'),
        successMessage: t('expenses.split.success', { count: parts.length }),
        // Nothing is shown early, so there is no local undo — but a partial
        // split may already be on the server, so the failure path resyncs
        // rather than guessing what landed.
        optimistic: () => () => refreshExpenses(),
        // Retrying could duplicate the parts that already inserted.
        retryable: false,
        perform: async () => {
          const created = await dataService.createExpensesBulk(
            restParts.map((part) => ({
              date: expense.date,
              description: expense.description,
              amount: part.amount,
              category_id: part.category_id,
              tag_id: expense.tag_id ?? null,
              note: expense.note ?? null,
              is_excluded: expense.is_excluded ?? false,
            })),
            activeOwnerId,
          );
          const updated = await dataService.updateExpense(
            {
              amount: firstPart.amount,
              category_id: firstPart.category_id,
              // The parts are amounts in the default currency. Leaving the
              // original's foreign pairing on the row made the detail screen
              // claim the full foreign figure, and re-opening the edit form
              // pre-filled it and re-converted — restoring the whole original
              // amount over the split part.
              original_amount: null,
              original_currency: null,
              exchange_rate: null,
            },
            expense.id,
          );

          return { created, updated };
        },
        commit: ({ created, updated }) =>
          setExpenses((prev) =>
            mergeUniqueById(replaceById(prev, expense.id, updated), created),
          ),
      });
    };

    return {
      handleExpenseSubmit,
      handleExpenseDelete,
      handleBulkExpenseImport,
      handleExpenseSplit,
    };
  }, [
    activeOwnerId,
    isInitialized,
    expensesRef,
    setExpenses,
    refreshDebts,
    refreshExpenses,
    runMutation,
    toast,
    t,
  ]);
};

// --- Helpers ---

type ReceiptResult = {
  receiptPath: string | null;
  receiptFailed: boolean;
};

const getPreviousDebtId = (
  expenseId: string | undefined,
  expenses: Expense[],
): string | null => {
  if (!expenseId) return null;

  return expenses.find((e) => e.id === expenseId)?.debt_id ?? null;
};

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

// Fire-and-forget storage cleanup. A failure here leaves an orphaned file,
// which is worth reporting but must never fail the user's save.
const deleteReceiptQuietly = (path: string, context: string): void => {
  deleteReceipt(path).catch((err) => {
    Sentry.captureException(err, {
      tags: { operation: 'deleteReceipt', context },
    });
  });
};

// Resolves the receipt side of a save: uploads or clears the file, then writes
// the resulting path back onto the row. Returns the path the expense should
// carry and the old file (if any) that is now safe to delete.
const settleReceipt = async (
  savedExpense: Expense,
  receiptOptions: ReceiptOptions | undefined,
): Promise<ReceiptResult & { oldPathToDelete: string | null }> => {
  if (!receiptOptions) {
    return {
      receiptPath: savedExpense.receipt_path ?? null,
      receiptFailed: false,
      oldPathToDelete: null,
    };
  }

  const { receiptPath, receiptFailed, uploadedNewPath, oldPathToDelete } =
    await processReceipt(savedExpense, receiptOptions, savedExpense.user_id);

  // Nothing to write back: the upload failed, or the path is unchanged.
  if (receiptFailed || receiptPath === (savedExpense.receipt_path ?? null)) {
    return { receiptPath, receiptFailed, oldPathToDelete };
  }

  try {
    const updated = await dataService.updateExpense(
      { receipt_path: receiptPath },
      savedExpense.id,
    );

    return {
      receiptPath: updated.receipt_path ?? null,
      receiptFailed,
      oldPathToDelete,
    };
  } catch (err) {
    // The file is in storage but no row points at it — take it back out
    // rather than orphaning it.
    if (uploadedNewPath) {
      deleteReceiptQuietly(uploadedNewPath, 'rollbackAfterReceiptUpdateFail');
    }

    throw err;
  }
};

// Queues the write for replay and applies the same row change locally, so the
// list looks saved while the device is offline.
const queueExpenseOffline = async (
  expenseData: ExpenseWritePayload,
  expenseId: string | undefined,
  ownerId: string,
  setExpenses: (updater: (prev: Expense[]) => Expense[]) => void,
): Promise<void> => {
  const mutationType = pickByEdit(expenseId, 'updateExpense', 'createExpense');
  const tempId = pickByEdit<string | null>(expenseId, null, createTempId());
  const idPayload = pickByEdit<Record<string, unknown>>(
    expenseId,
    { id: expenseId },
    { __tempId: tempId },
  );

  await offlineQueue.enqueueWithReconcile(mutationType, {
    ...expenseData,
    user_id: ownerId,
    ...idPayload,
  } as Record<string, unknown>);

  // The queued payload keeps extra_tag_ids for replay; the local
  // optimistic row must not carry the write-only field.
  const { extra_tag_ids: _extras, ...expenseRow } = expenseData;
  const offlineRow = { ...expenseRow, user_id: ownerId };
  const isDebtPayment = expenseData.type === 'debt_payment';

  setExpenses((prev) => {
    if (expenseId) {
      if (isDebtPayment) return prev.filter((e) => e.id !== expenseId);

      return patchById(prev, expenseId, offlineRow);
    }

    if (isDebtPayment) return prev;

    const optimistic = {
      ...offlineRow,
      id: tempId as string,
      created_at: new Date().toISOString(),
    } as Expense;

    return [optimistic, ...prev];
  });
};
