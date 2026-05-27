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

// Supabase/PostgREST returns these when the JWT has lapsed (common on iOS PWA
// after backgrounding). supabase-js refreshes the session and the next call
// succeeds, so there's nothing actionable to report.
export const isExpiredJwtError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const record = error as Record<string, unknown>;
  if (record.code === 'PGRST301' || record.code === 'PGRST303') return true;
  if (
    typeof record.message === 'string' &&
    record.message.toLowerCase().includes('jwt expired')
  )
    return true;

  return false;
};
