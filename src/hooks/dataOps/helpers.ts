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
