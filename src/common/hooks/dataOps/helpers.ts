import { captureException } from '@/config/sentry';
import { recurringSuggestionService } from '@/common/api/recurringSuggestionService';

export const replaceById = <T extends { id: string }>(
  list: T[],
  id: string,
  replacement: T,
): T[] =>
  list.map((item) => {
    if (item.id === id) {
      return replacement;
    }

    return item;
  });

export const patchById = <T extends { id: string }>(
  list: T[],
  id: string,
  patch: Partial<T>,
): T[] =>
  list.map((item) => {
    if (item.id === id) {
      return { ...item, ...patch } as T;
    }

    return item;
  });

export const pickByEdit = <T>(
  id: string | undefined | null,
  whenEdit: T,
  whenNew: T,
): T => {
  if (id) {
    return whenEdit;
  }

  return whenNew;
};

// --- Optimistic shapes ---
//
// The three ways an optimistic list write can go, each returning its own undo.
// Every dataOps hook was hand-rolling these. Each undo reverses only its own
// change, and does it inside an updater so it lands after whatever else has
// happened to the list since. Restoring a snapshot of the whole list — what
// these used to do — also rolled back every other write that overlapped:
// delete two goals, have the first fail, and the second came back.

type SetItems<T> = (updater: T[] | ((prev: T[]) => T[])) => void;

// Optimistic create: show the row now, drop it if the write fails.
export const prependOptimistic = <T extends { id: string }>(
  setItems: SetItems<T>,
  item: T,
): (() => void) => {
  setItems((prev) => [item, ...prev]);

  return () => setItems((prev) => prev.filter((i) => i.id !== item.id));
};

// Optimistic update: patch in place; if the write fails, put back the fields
// the patch touched and leave the rest of the row, and the list, as they are.
export const patchOptimistic = <T extends { id: string }>(
  setItems: SetItems<T>,
  id: string,
  patch: Partial<T>,
): (() => void) => {
  let original: Partial<T> | null = null;
  setItems((prev) => {
    const current = prev.find((item) => item.id === id);
    if (current) {
      original = pickFields(current, patch);
    }

    return patchById(prev, id, patch);
  });

  return () =>
    setItems((prev) => {
      if (!original) {
        return prev;
      }

      return patchById(prev, id, original);
    });
};

// Optimistic delete: remove now; if the write fails, put that one row back
// where it was.
export const removeOptimistic = <T extends { id: string }>(
  setItems: SetItems<T>,
  id: string,
): (() => void) => {
  let removed: { item: T; index: number } | null = null;
  setItems((prev) => {
    const index = prev.findIndex((item) => item.id === id);
    if (index !== -1) {
      removed = { item: prev[index], index };
    }

    return prev.filter((i) => i.id !== id);
  });

  return () => setItems((prev) => restoreRemoved(prev, removed));
};

// The current values of the fields a patch is about to change.
export const pickFields = <T>(row: T, patch: Partial<T>): Partial<T> => {
  const fields: Partial<T> = {};
  for (const key of Object.keys(patch) as Array<keyof T>) {
    fields[key] = row[key];
  }

  return fields;
};

const restoreRemoved = <T extends { id: string }>(
  list: T[],
  removed: { item: T; index: number } | null,
): T[] => {
  if (!removed || list.some((item) => item.id === removed.item.id)) {
    return list;
  }

  const index = Math.min(removed.index, list.length);

  return [...list.slice(0, index), removed.item, ...list.slice(index)];
};

// Optimistic scalar setting (a currency, a reminder hour, a percentage):
// show the new value now, put the old one back if the write fails.
export const setScalarOptimistic = <T>(
  setValue: (value: T) => void,
  previous: T,
  next: T,
): (() => void) => {
  setValue(next);

  return () => setValue(previous);
};

// Links imported rows to the recurring schedules they belong to. It runs after
// the rows are saved, so a failure here must not report the import as failed:
// the user would retry, and the retry would insert every row a second time.
// Unlinked rows are still correct rows; the next import reconciles them.
export const reconcileImportedRows = async (
  ownerId: string,
  refresh: () => Promise<void>,
): Promise<void> => {
  try {
    const reconciled = await recurringSuggestionService.reconcile(ownerId);
    if (reconciled > 0) {
      await refresh();
    }
  } catch (error) {
    captureException(error, { tags: { operation: 'reconcileImport' } });
  }
};
