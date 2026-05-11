import { useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import { useToast } from '@/hooks/useToast';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { uploadReceipt, deleteReceipt } from '@/services/receiptService';
import { haptics } from '@/lib/haptics';
import { offlineQueue } from '@/lib/offlineQueue';
import type { Expense } from '@/types/Expense';
import { replaceById, patchById, pickByEdit } from './helpers';
import { useShowErrorToast } from './useShowErrorToast';

export type ReceiptOptions = {
  receiptFile: File | null;
  removeExistingReceipt: boolean;
  existingReceiptPath: string | null;
};

type BulkExpenseRow = {
  date: string;
  description: string;
  amount: number;
  category_id: string | null;
};

export const useExpenseOps = () => {
  const { isInitialized } = useDataConfig();
  const { setExpenses, refreshExpenses, refreshDebts, expensesRef } =
    useDataActions();
  const { toast } = useToast();
  const showErrorToast = useShowErrorToast();

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
        let savedExpense: Expense;
        if (expenseId) {
          savedExpense = await dataService.updateExpense(expenseData, expenseId);
        } else {
          savedExpense = await dataService.createExpense(expenseData);
        }

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
            description: 'Expense saved but receipt upload failed',
          });
        } else {
          toast({
            variant: 'success',
            title: pickByEdit(expenseId, 'Expense updated', 'Expense added'),
          });
        }
      } catch (error) {
        if (!navigator.onLine) {
          const mutationType = pickByEdit(
            expenseId,
            'updateExpense',
            'createExpense',
          );
          const tempId = pickByEdit<string | null>(
            expenseId,
            null,
            `temp-${Date.now()}`,
          );
          const idPayload = pickByEdit<Record<string, unknown>>(
            expenseId,
            { id: expenseId },
            { __tempId: tempId },
          );
          await offlineQueue.enqueue(mutationType, {
            ...expenseData,
            ...idPayload,
          } as Record<string, unknown>);
          const isDebtPayment = expenseData.type === 'debt_payment';
          setExpenses((prev) => {
            if (expenseId) {
              if (isDebtPayment) return prev.filter((e) => e.id !== expenseId);

              return patchById(prev, expenseId, expenseData);
            }

            if (isDebtPayment) return prev;

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
            title: 'Expense queued',
            description: 'Will sync when back online',
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
          `Failed to ${pickByEdit(expenseId, 'update', 'add')} expense`,
        );
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
        if (!navigator.onLine) {
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

  const handleBulkExpenseImport = useCallback(
    async (expensesData: BulkExpenseRow[]) => {
      if (!isInitialized) return;

      await dataService.createExpensesBulk(expensesData);
      await refreshExpenses();
    },
    [isInitialized, refreshExpenses],
  );

  return useMemo(
    () => ({ handleExpenseSubmit, handleExpenseDelete, handleBulkExpenseImport }),
    [handleExpenseSubmit, handleExpenseDelete, handleBulkExpenseImport],
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
