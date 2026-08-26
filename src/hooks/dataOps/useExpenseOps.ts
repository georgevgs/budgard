import { useCallback, useMemo } from 'react';
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
import { useShowErrorToast } from '@/hooks/dataOps/useShowErrorToast';

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
  const { isInitialized } = useDataConfig();
  const { setExpenses, refreshDebts, refreshExpenses, expensesRef } =
    useDataActions();
  const { toast } = useToast();
  const { t } = useTranslation();
  const showErrorToast = useShowErrorToast();

  const handleExpenseSubmit = useCallback(
    async (
      expenseData: ExpenseWritePayload,
      expenseId?: string,
      receiptOptions?: ReceiptOptions,
    ) => {
      const run = async () => {
        if (!isInitialized) {
          return;
        }

        try {
          let savedExpense: Expense;
          if (expenseId) {
            savedExpense = await dataService.updateExpense(expenseData, expenseId);
          } else {
            savedExpense = await dataService.createExpense(expenseData);
          }

          let receiptPath = savedExpense.receipt_path ?? null;
          let receiptFailed = false;
          let oldPathToDelete: string | null = null;

          if (receiptOptions) {
            let uploadedNewPath: string | null = null;
            ({
              receiptPath,
              receiptFailed,
              uploadedNewPath,
              oldPathToDelete,
            } = await processReceipt(
              savedExpense,
              receiptOptions,
              savedExpense.user_id,
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

          const previousDebtId = getPreviousDebtId(expenseId, expensesRef.current);
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
            refreshDebts().catch((err) => {
              Sentry.captureException(err, {
                tags: { context: 'afterExpenseSubmitDebt' },
              });
            });
          }

          if (receiptFailed) {
            toast({
              variant: 'destructive',
              description: t('expenses.toasts.receiptUploadFailed'),
            });
          } else {
            toast({
              variant: 'success',
              title: pickByEdit(
                expenseId,
                t('expenses.toasts.updated'),
                t('expenses.toasts.added'),
              ),
            });
          }
        } catch (error) {
          if (isOfflineError(error)) {
            const mutationType = pickByEdit(
              expenseId,
              'updateExpense',
              'createExpense',
            );
            const tempId = pickByEdit<string | null>(
              expenseId,
              null,
              createTempId(),
            );
            const idPayload = pickByEdit<Record<string, unknown>>(
              expenseId,
              { id: expenseId },
              { __tempId: tempId },
            );
            await offlineQueue.enqueueWithReconcile(mutationType, {
              ...expenseData,
              ...idPayload,
            } as Record<string, unknown>);
            // The queued payload keeps extra_tag_ids for replay; the local
            // optimistic row must not carry the write-only field.
            const { extra_tag_ids: _extras, ...offlineRow } = expenseData;
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
            haptics.success();
            toast({
              variant: 'success',
              title: t('offline.savedOffline'),
              description: t('offline.willSync'),
            });

            return;
          }
          haptics.error();
          Sentry.captureException(error, {
            tags: {
              operation: pickByEdit(expenseId, 'updateExpense', 'createExpense'),
            },
          });
          showErrorToast(
            pickByEdit(
              expenseId,
              t('expenses.toasts.updateFailed'),
              t('expenses.toasts.addFailed'),
            ),
            () => {
              void run().catch(() => undefined);
            },
          );
          throw error;
        }
      };

      return run();
    },
    [isInitialized, expensesRef, setExpenses, refreshDebts, showErrorToast, toast, t],
  );

  const handleExpenseDelete = useCallback(
    async (expenseId: string) => {
      const run = async () => {
        if (!isInitialized) {
          return;
        }

        haptics.warning();
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

          if (receiptPath) {
            deleteReceipt(receiptPath).catch((err) => {
              Sentry.captureException(err, {
                tags: { operation: 'deleteReceipt', context: 'afterExpenseDelete' },
              });
            });
          }
        } catch (error) {
          if (isOfflineError(error)) {
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

            return;
          }
          haptics.error();
          Sentry.captureException(error, { tags: { operation: 'deleteExpense' } });
          showErrorToast(t('expenses.toasts.deleteFailed'), () => {
            void run().catch(() => undefined);
          });
          throw error;
        }
      };

      return run();
    },
    [isInitialized, expensesRef, setExpenses, refreshDebts, showErrorToast, toast, t],
  );

  const handleBulkExpenseImport = useCallback(
    async (expensesData: BulkExpenseRow[]) => {
      if (!isInitialized) return;

      // The insert returns the created rows with their embeds, so merging
      // them into state replaces a full-history re-download. Consumers sort
      // before display, so append order doesn't matter.
      const created = await dataService.createExpensesBulk(expensesData);
      setExpenses((prev) => mergeUniqueById(prev, created));
    },
    [isInitialized, setExpenses],
  );

  // Splits one expense into several: the original row keeps its receipt and
  // recurring link and takes the first part; the rest are new rows with the
  // same date, description, tag, note and exclusion state.
  //
  // The new rows are written FIRST and the original is shrunk last. The other
  // order shrinks the original and then, if the insert fails, leaves the
  // remainder existing nowhere — €120 split three ways became a single €40
  // row with an error toast. Written this way the worst case is a duplicate
  // set of parts alongside an intact original, which is visible and
  // correctable, rather than money that is simply gone.
  const handleExpenseSplit = useCallback(
    async (expense: Expense, parts: SplitPart[]) => {
      if (!isInitialized || parts.length < 2) return;

      const [firstPart, ...restParts] = parts;
      try {
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
        setExpenses((prev) =>
          mergeUniqueById(replaceById(prev, expense.id, updated), created),
        );
        haptics.success();
        toast({
          variant: 'success',
          title: t('expenses.split.success', { count: parts.length }),
        });
      } catch (error) {
        haptics.error();
        // A partial split may already be on the server — resync rather than guess
        refreshExpenses();
        Sentry.captureException(error, { tags: { operation: 'splitExpense' } });
        showErrorToast(t('expenses.split.failed'));
        throw error;
      }
    },
    [isInitialized, setExpenses, refreshExpenses, showErrorToast, toast, t],
  );

  return useMemo(
    () => ({
      handleExpenseSubmit,
      handleExpenseDelete,
      handleBulkExpenseImport,
      handleExpenseSplit,
    }),
    [
      handleExpenseSubmit,
      handleExpenseDelete,
      handleBulkExpenseImport,
      handleExpenseSplit,
    ],
  );
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
