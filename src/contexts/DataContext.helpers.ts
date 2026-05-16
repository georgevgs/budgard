export const mergeUniqueById = <T extends { id: string }>(
  prev: T[],
  incoming: T[],
): T[] => {
  const existingIds = new Set(prev.map((item) => item.id));
  const fresh = incoming.filter((item) => !existingIds.has(item.id));

  if (fresh.length === 0) {
    return prev;
  }

  return [...prev, ...fresh];
};

export const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.message.includes('AbortError'))
    return true;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    String((error as Record<string, unknown>).message).includes('AbortError')
  )
    return true;

  return false;
};
