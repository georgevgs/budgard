import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { captureException } from '@/config/sentry';
import { useTranslation } from 'react-i18next';
import { useToast, type ToastParams } from '@/common/hooks/useToast';
import { useDataActions, useDataConfig } from '@/common/contexts/DataContext';
import { dataService } from '@/common/api/dataService';
import type { ExpenseWritePayload } from '@/common/api/dataService';
import { uploadReceipt, deleteReceipt } from '@/common/api/receiptService';
import { haptics } from '@/constants/haptics';
import { offlineQueue, createTempId } from '@/constants/offlineQueue';
import { isOfflineError } from '@/constants/offlineError';
import { describeAmount } from '@/constants/transactionAmount';
import type { TranslateFunction } from '@/constants/translate';
import type { Expense } from '@/types/Expense';
import {
  replaceById,
  patchById,
  pickByEdit,
} from '@/common/hooks/dataOps/helpers';
import { mergeUniqueById } from '@/common/contexts/dataContextHelpers';
import { useMutationRunner } from '@/common/hooks/dataOps/useMutationRunner';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';
import { recurringSuggestionService } from '@/common/api/recurringSuggestionService';

export type ReceiptOptions = {
  receiptFile: File | null;
  shouldRemoveExistingReceipt: boolean;
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
  const { isInitialized, defaultCurrency } = useDataConfig();
  const { setExpenses, refreshDebts, refreshExpenses, expensesRef } =
    useDataActions();
  const { toast } = useToast();
  const { t } = useTranslation();
  const runMutation = useMutationRunner();

  return useMemo(() => {
    const shouldSkip = !isInitialized;
    const deps: ExpenseOpDeps = {
      t,
      toast,
      setExpenses,
      activeOwnerId,
      defaultCurrency,
      refreshDebts,
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
        shouldSkip,
        errorMessage: pickByEdit(
          expenseId,
          t('expenses.toasts.updateFailed'),
          t('expenses.toasts.addFailed'),
        ),
        offlineFallback: async (error) => {
          if (!isOfflineError(error)) {
            return false;
          }

          await saveExpenseOffline(deps, expenseData, expenseId);

          return true;
        },
        perform: () =>
          performExpenseSave(
            expenseData,
            expenseId,
            receiptOptions,
            activeOwnerId,
          ),
        commit: (saved) =>
          commitExpenseSave(
            deps,
            saved,
            expenseId,
            previousDebtId,
            handleExpenseDelete,
          ),
      });
    };

    // The row is removed once the delete lands, not before — a failed delete
    // that already emptied the row would read as data loss.
    //
    // `knownDebtId` covers a row the local list never held in the first place
    // — a debt payment, deliberately excluded from `expenses` — so undoing one
    // can still refresh the debt it belonged to instead of leaving its balance
    // stale until an unrelated refresh happens to catch it up.
    const handleExpenseDelete = (
      expenseId: string,
      knownDebtId?: string | null,
    ) => {
      const existing = expensesRef.current.find((e) => e.id === expenseId);
      const receiptPath = existing?.receipt_path ?? null;
      const deletedDebtId = existing?.debt_id ?? knownDebtId ?? null;

      return runMutation({
        operation: 'deleteExpense',
        shouldSkip,
        errorMessage: t('expenses.toasts.deleteFailed'),
        onStart: () => haptics.warning(),
        successHaptic: 'none',
        offlineFallback: async (error) => {
          if (!isOfflineError(error)) {
            return false;
          }

          await deleteExpenseOffline(deps, expenseId);

          return true;
        },
        perform: () => dataService.deleteExpense(expenseId),
        commit: () =>
          commitExpenseDelete(deps, expenseId, deletedDebtId, receiptPath),
      });
    };

    const handleBulkExpenseImport = async (expensesData: BulkExpenseRow[]) => {
      if (shouldSkip) {
        return;
      }

      await importExpenseRows(expensesData, deps, refreshExpenses);
    };

    // Splits one expense into several: the original row keeps its receipt and
    // recurring link and takes the first part; the rest are new rows with the
    // same date, description, tag, note and exclusion state.
    const handleExpenseSplit = (expense: Expense, parts: SplitPart[]) => {
      return runMutation({
        operation: 'splitExpense',
        shouldSkip: shouldSkip || parts.length < 2,
        errorMessage: t('expenses.split.failed'),
        successMessage: t('expenses.split.success', { count: parts.length }),
        // Nothing is shown early, so there is no local undo — but a partial
        // split may already be on the server, so the failure path resyncs
        // rather than guessing what landed.
        optimistic: () => () => refreshExpenses(),
        // Retrying could duplicate the parts that already inserted.
        isRetryable: false,
        perform: () => performSplit(expense, parts, activeOwnerId),
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
    defaultCurrency,
    expensesRef,
    setExpenses,
    refreshDebts,
    refreshExpenses,
    runMutation,
    toast,
    t,
  ]);
};

// What the write paths below need from the hook. Passing it as one object is
// what lets each of them be a named function rather than another closure
// inside an already long useMemo.
type ExpenseOpDeps = {
  t: TranslateFunction;
  toast: (params: ToastParams) => void;
  setExpenses: Dispatch<SetStateAction<Expense[]>>;
  activeOwnerId: string;
  defaultCurrency: string;
  refreshDebts: () => Promise<void>;
};

type SavedExpense = {
  finalExpense: Expense;
  hasReceiptFailed: boolean;
};

const refreshDebtsQuietly = (
  refreshDebts: () => Promise<void>,
  context: string,
): void => {
  refreshDebts().catch((error) => {
    captureException(error, { tags: { context } });
  });
};

const saveExpenseOffline = async (
  deps: ExpenseOpDeps,
  expenseData: ExpenseWritePayload,
  expenseId: string | undefined,
): Promise<void> => {
  await queueExpenseOffline(
    expenseData,
    expenseId,
    deps.activeOwnerId,
    deps.setExpenses,
  );
  haptics.success();
  deps.toast({
    variant: 'success',
    title: deps.t('offline.savedOffline'),
    description: deps.t('offline.willSync'),
  });
};

const performExpenseSave = async (
  expenseData: ExpenseWritePayload,
  expenseId: string | undefined,
  receiptOptions: ReceiptOptions | undefined,
  activeOwnerId: string,
): Promise<SavedExpense> => {
  let savedExpense: Expense;
  if (expenseId) {
    savedExpense = await dataService.updateExpense(expenseData, expenseId);
  } else {
    savedExpense = await dataService.createExpense(expenseData, activeOwnerId);
  }

  const { receiptPath, hasReceiptFailed, oldPathToDelete } =
    await settleReceipt(savedExpense, receiptOptions);

  if (oldPathToDelete) {
    deleteReceiptQuietly(oldPathToDelete, 'afterReceiptUpdateSuccess');
  }

  return {
    finalExpense: { ...savedExpense, receipt_path: receiptPath },
    hasReceiptFailed,
  };
};

const commitExpenseSave = (
  deps: ExpenseOpDeps,
  { finalExpense, hasReceiptFailed }: SavedExpense,
  expenseId: string | undefined,
  previousDebtId: string | null,
  onUndoDelete: (expenseId: string, knownDebtId?: string | null) => void,
): void => {
  const isDebtPayment = finalExpense.type === 'debt_payment';

  deps.setExpenses((prev) =>
    applySavedExpense(prev, finalExpense, expenseId, isDebtPayment),
  );

  if (finalExpense.debt_id || previousDebtId) {
    refreshDebtsQuietly(deps.refreshDebts, 'afterExpenseSubmitDebt');
  }

  // Not `successMessage`: the expense saved either way, but a failed receipt
  // has to say so rather than claim a clean save.
  if (hasReceiptFailed) {
    deps.toast({
      variant: 'destructive',
      description: deps.t('expenses.toasts.receiptUploadFailed'),
    });

    return;
  }

  deps.toast({
    variant: 'success',
    title: resolveSuccessTitle(expenseId, isDebtPayment, deps.t),
    description: describeSavedExpense(finalExpense, deps.defaultCurrency),
    action: buildUndoAction(expenseId, finalExpense, onUndoDelete, deps.t),
  });
};

// A debt payment lives on the debt, and is deliberately absent from
// `expenses` — so saving one removes the row rather than adding it.
const applySavedExpense = (
  prev: Expense[],
  finalExpense: Expense,
  expenseId: string | undefined,
  isDebtPayment: boolean,
): Expense[] => {
  if (expenseId) {
    if (isDebtPayment) {
      return prev.filter((e) => e.id !== expenseId);
    }

    return replaceById(prev, expenseId, finalExpense);
  }

  if (isDebtPayment) {
    return prev;
  }

  return [finalExpense, ...prev];
};

// The insert returns the created rows with their embeds, so merging them into
// state replaces a full-history re-download. Consumers sort before display, so
// append order does not matter.
const importExpenseRows = async (
  rows: BulkExpenseRow[],
  deps: ExpenseOpDeps,
  refreshExpenses: () => Promise<void>,
): Promise<void> => {
  const created = await dataService.createExpensesBulk(
    rows,
    deps.activeOwnerId,
    'import',
  );
  deps.setExpenses((prev) => mergeUniqueById(prev, created));

  const reconciled = await recurringSuggestionService.reconcile(
    deps.activeOwnerId,
  );
  if (reconciled > 0) {
    await refreshExpenses();
  }
};

const deleteExpenseOffline = async (
  deps: ExpenseOpDeps,
  expenseId: string,
): Promise<void> => {
  await offlineQueue.enqueueWithReconcile('deleteExpense', { id: expenseId });
  deps.setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
  haptics.success();
  deps.toast({
    variant: 'success',
    title: deps.t('offline.deleteSavedOffline'),
    description: deps.t('offline.willSync'),
  });
};

const commitExpenseDelete = (
  deps: ExpenseOpDeps,
  expenseId: string,
  deletedDebtId: string | null,
  receiptPath: string | null,
): void => {
  deps.setExpenses((prev) => prev.filter((e) => e.id !== expenseId));

  if (deletedDebtId) {
    refreshDebtsQuietly(deps.refreshDebts, 'afterExpenseDeleteDebt');
  }

  if (receiptPath) {
    deleteReceiptQuietly(receiptPath, 'afterExpenseDelete');
  }
};

/**
 * The new rows are written FIRST and the original is shrunk last.
 *
 * The other order shrinks the original and then, if the insert fails, leaves
 * the remainder existing nowhere — €120 split three ways became a single €40
 * row with an error toast. Written this way the worst case is a duplicate set
 * of parts alongside an intact original, which is visible and correctable,
 * rather than money that is simply gone.
 */
const performSplit = async (
  expense: Expense,
  parts: SplitPart[],
  activeOwnerId: string,
) => {
  const [firstPart, ...restParts] = parts;

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
      // The parts are amounts in the default currency. Leaving the original's
      // foreign pairing on the row made the detail screen claim the full
      // foreign figure, and re-opening the edit form pre-filled it and
      // re-converted — restoring the whole original amount over the split part.
      original_amount: null,
      original_currency: null,
      exchange_rate: null,
    },
    expense.id,
  );

  return { created, updated };
};

type ReceiptResult = {
  receiptPath: string | null;
  hasReceiptFailed: boolean;
};

// The generic "Expense added" title says a write landed; this says which one,
// so a name typed a moment ago and a total glimpsed in passing both confirm
// against the same line instead of the user re-opening the row to check.
const describeSavedExpense = (expense: Expense, currency: string): string => {
  const amount = describeAmount(expense.amount, 'expense', currency);

  return `${amount.text} · ${expense.description}`;
};

// A debt payment is stored as an expense row, but it isn't one to the person
// who just logged it — "Expense added" doesn't match what they did.
const resolveSuccessTitle = (
  expenseId: string | undefined,
  isDebtPayment: boolean,
  t: TranslateFunction,
): string => {
  if (isDebtPayment) {
    return pickByEdit(
      expenseId,
      t('debts.toasts.paymentUpdated'),
      t('debts.toasts.paymentLogged'),
    );
  }

  return pickByEdit(
    expenseId,
    t('expenses.toasts.updated'),
    t('expenses.toasts.added'),
  );
};

type ToastAction = { label: string; onClick: () => void };

// Undo only offers itself on a fresh add. An edit has no snapshot of what the
// row looked like a moment ago to restore, where a brand new row does: taking
// it back out is the whole undo, so `handleExpenseDelete` is enough — no
// separate rollback machinery to build or keep in sync. The debt id travels
// along explicitly because a debt payment's row was never in local state for
// `handleExpenseDelete` to read it back off of.
const buildUndoAction = (
  expenseId: string | undefined,
  finalExpense: Expense,
  onUndo: (id: string, knownDebtId?: string | null) => void,
  t: TranslateFunction,
): ToastAction | undefined => {
  if (expenseId) {
    return undefined;
  }

  return {
    label: t('common.undo'),
    onClick: () => onUndo(finalExpense.id, finalExpense.debt_id ?? null),
  };
};

const getPreviousDebtId = (
  expenseId: string | undefined,
  expenses: Expense[],
): string | null => {
  if (!expenseId) {
    return null;
  }

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
  const { receiptFile, shouldRemoveExistingReceipt, existingReceiptPath } =
    receiptOptions;
  let receiptPath = savedExpense.receipt_path ?? null;
  let hasReceiptFailed = false;
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
      captureException(error, { tags: { operation: 'uploadReceipt' } });
      hasReceiptFailed = true;
    }
  } else if (shouldRemoveExistingReceipt) {
    receiptPath = null;
    if (existingReceiptPath) {
      oldPathToDelete = existingReceiptPath;
    }
  }

  return { receiptPath, hasReceiptFailed, uploadedNewPath, oldPathToDelete };
};

// Fire-and-forget storage cleanup. A failure here leaves an orphaned file,
// which is worth reporting but must never fail the user's save.
const deleteReceiptQuietly = (path: string, context: string): void => {
  deleteReceipt(path).catch((err) => {
    captureException(err, {
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
      hasReceiptFailed: false,
      oldPathToDelete: null,
    };
  }

  const { receiptPath, hasReceiptFailed, uploadedNewPath, oldPathToDelete } =
    await processReceipt(savedExpense, receiptOptions, savedExpense.user_id);

  // Nothing to write back: the upload failed, or the path is unchanged.
  if (hasReceiptFailed || receiptPath === (savedExpense.receipt_path ?? null)) {
    return { receiptPath, hasReceiptFailed, oldPathToDelete };
  }

  try {
    const updated = await dataService.updateExpense(
      { receipt_path: receiptPath },
      savedExpense.id,
    );

    return {
      receiptPath: updated.receipt_path ?? null,
      hasReceiptFailed,
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
      if (isDebtPayment) {
        return prev.filter((e) => e.id !== expenseId);
      }

      return patchById(prev, expenseId, offlineRow);
    }

    if (isDebtPayment) {
      return prev;
    }

    const optimistic = {
      ...offlineRow,
      id: tempId as string,
      created_at: new Date().toISOString(),
    } as Expense;

    return [optimistic, ...prev];
  });
};
