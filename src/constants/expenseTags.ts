import type { Expense } from '@/types/Expense';

// A tag "belongs" to an expense when it is the primary tag OR one of the
// Pro-only extras. Every feature that means "expense has this tag" (filtering,
// tag goals, …) must check both, so the rule lives in one place.
export const expenseHasTag = (expense: Expense, tagId: string): boolean => {
  if (expense.tag_id === tagId) {
    return true;
  }
  if (!expense.extra_tags) {
    return false;
  }

  return expense.extra_tags.some((tag) => tag.id === tagId);
};

// Flattens the form's primary + extras selection into one ordered, de-duped
// list (primary first). The submit path rebuilds tag_id/extra_tag_ids from it
// so the "extras never exist without a primary" invariant always holds.
export const collectExpenseTagIds = (
  primaryTagId: string | undefined,
  extraTagIds: string[] | undefined,
): string[] => {
  const ids: string[] = [];
  if (primaryTagId) {
    ids.push(primaryTagId);
  }
  for (const id of extraTagIds ?? []) {
    if (!ids.includes(id)) {
      ids.push(id);
    }
  }

  return ids;
};
