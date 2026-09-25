// Tag and category names are unique per financial space in the database
// (tags_user_id_name_key, categories_user_id_name_key). A create the client
// offers but the database refuses surfaces as a bare "couldn't add" with a
// retry that can never succeed, so the client compares names the way a person
// reads them: ignoring case, and ignoring the trailing space iOS inserts after
// a keyboard suggestion. CSV import resolves categories the same way.
export const toNameKey = (name: string): string => name.trim().toLowerCase();

export const isSameName = (a: string, b: string): boolean =>
  toNameKey(a) === toNameKey(b);

// PostgREST's code for a unique_violation: the local list was stale — another
// device or the household partner took the name first.
export const isNameConflictError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return (error as { code?: unknown }).code === '23505';
};
