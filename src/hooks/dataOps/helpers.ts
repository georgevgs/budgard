export const replaceById = <T extends { id: string }>(
  list: T[],
  id: string,
  replacement: T,
): T[] =>
  list.map((item) => {
    if (item.id === id) return replacement;

    return item;
  });

export const patchById = <T extends { id: string }>(
  list: T[],
  id: string,
  patch: Partial<T>,
): T[] =>
  list.map((item) => {
    if (item.id === id) return { ...item, ...patch } as T;

    return item;
  });

export const pickByEdit = <T>(
  id: string | undefined | null,
  whenEdit: T,
  whenNew: T,
): T => {
  if (id) return whenEdit;

  return whenNew;
};

// --- Optimistic shapes ---
//
// The three ways an optimistic list write can go, each returning its own undo.
// Every dataOps hook was hand-rolling these; they read the previous list from
// inside the updater rather than from a captured variable, which is what makes
// the rollback correct when two writes overlap.

type SetItems<T> = (updater: T[] | ((prev: T[]) => T[])) => void;

// Optimistic create: show the row now, drop it if the write fails.
export const prependOptimistic = <T extends { id: string }>(
  setItems: SetItems<T>,
  item: T,
): (() => void) => {
  setItems((prev) => [item, ...prev]);

  return () => setItems((prev) => prev.filter((i) => i.id !== item.id));
};

// Optimistic update: patch in place, restore the whole list if the write fails.
export const patchOptimistic = <T extends { id: string }>(
  setItems: SetItems<T>,
  id: string,
  patch: Partial<T>,
): (() => void) => {
  let previous: T[] = [];
  setItems((prev) => {
    previous = prev;

    return patchById(prev, id, patch);
  });

  return () => setItems(previous);
};

// Optimistic delete: remove now, restore the whole list if the write fails.
export const removeOptimistic = <T extends { id: string }>(
  setItems: SetItems<T>,
  id: string,
): (() => void) => {
  let previous: T[] = [];
  setItems((prev) => {
    previous = prev;

    return prev.filter((i) => i.id !== id);
  });

  return () => setItems(previous);
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
