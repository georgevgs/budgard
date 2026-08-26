// Every read and write in dataService ends the same three lines: destructure
// `{ data, error }`, throw the error, cast the rows to the domain type. That
// tail appeared 62 times. These two helpers own it.
//
// Deliberately NOT a query builder. The Supabase chain stays spelled out at
// each call site, because the `select` strings there name their FKs explicitly
// — the bare `tags` embed turned ambiguous when expense_tags landed and broke
// months-stale PWA bundles with PGRST201 (see the embed notes in dataService).
// Those strings have to stay readable where they are used, not be assembled by
// a helper that could guess one wrong.

type PostgrestResult = PromiseLike<{ data: unknown; error: unknown }>;

// The rows a query returned.
export const rows = async <T>(query: PostgrestResult): Promise<T[]> => {
  const { data, error } = await query;

  if (error) throw error;

  return data as T[];
};

// The single row a query returned. Use with `.single()` — a query that may
// legitimately match nothing wants `maybeRow` instead.
export const row = async <T>(query: PostgrestResult): Promise<T> => {
  const { data, error } = await query;

  if (error) throw error;

  return data as T;
};

// The single row a query returned, or null when nothing matched. Use with
// `.maybeSingle()`.
export const maybeRow = async <T>(query: PostgrestResult): Promise<T | null> => {
  const { data, error } = await query;

  if (error) throw error;

  return data as T | null;
};

// A write whose result is discarded — deletes, and updates nothing reads back.
export const done = async (query: PostgrestResult): Promise<void> => {
  const { error } = await query;

  if (error) throw error;
};
