import { isSameName } from '@/constants/names';
import type { Category } from '@/types/Category';

// categories_user_id_name_key spans both types: an income source cannot share
// a name with an expense category, so `categories` must be the whole space.
// `editing` is the row being changed, which may always keep its own name —
// including a case variant that predates this check.
export const isCategoryNameTaken = (
  name: string,
  categories: Category[],
  editing?: Category,
): boolean => {
  if (editing && isSameName(editing.name, name)) {
    return false;
  }

  return categories.some(
    (category) =>
      category.id !== editing?.id && isSameName(category.name, name),
  );
};
