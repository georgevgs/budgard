import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataActions, useDataConfig } from '@/common/contexts/DataContext';
import { dataService } from '@/common/api/dataService';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import type { CategoryBudget } from '@/types/CategoryBudget';
import {
  patchById,
  pickFields,
  replaceById,
} from '@/common/hooks/dataOps/helpers';
import { useMutationRunner } from '@/common/hooks/dataOps/useMutationRunner';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';

// Categories are embedded in expense and income rows, so editing one has to
// sweep those slices too — and put all of them back together on failure.
// That is why these keep bespoke optimistic closures.
export const useCategoryOps = () => {
  const { activeOwnerId } = useFinancialSpace();
  const { isInitialized } = useDataConfig();
  const {
    setCategories,
    setExpenses,
    setIncomes,
    setCategoryBudgets,
    refreshExpenses,
    refreshIncomes,
  } = useDataActions();
  const { t } = useTranslation();
  const runMutation = useMutationRunner();

  return useMemo(() => {
    const shouldSkip = !isInitialized;
    const slices: CategorySlices = {
      setCategories,
      setExpenses,
      setIncomes,
      setCategoryBudgets,
    };
    const refreshRows = { refreshExpenses, refreshIncomes };

    const handleCategoryAdd = (categoryData: Partial<Category>) => {
      const optimistic = {
        ...categoryData,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
      } as Category;

      return runMutation({
        operation: 'createCategory',
        shouldSkip,
        errorMessage: t('categories.toasts.addFailed'),
        optimistic: () => {
          setCategories((prev) => [...prev, optimistic]);

          return () =>
            setCategories((prev) => prev.filter((c) => c.id !== optimistic.id));
        },
        perform: () => dataService.createCategory(categoryData, activeOwnerId),
        commit: (saved) =>
          setCategories((prev) =>
            sortByName([...prev.filter((c) => c.id !== optimistic.id), saved]),
          ),
      });
    };

    const handleCategoryUpdate = (
      categoryId: string,
      categoryData: Partial<Category>,
    ) =>
      runMutation({
        operation: 'updateCategory',
        shouldSkip,
        errorMessage: t('categories.toasts.updateFailed'),
        optimistic: () => patchEverywhere(slices, categoryId, categoryData),
        perform: () => dataService.updateCategory(categoryId, categoryData),
        commit: (saved) => {
          setCategories((prev) =>
            sortByName(replaceById(prev, categoryId, saved)),
          );
          setExpenses((prev) =>
            prev.map((e) => assignCategory(e, categoryId, saved)),
          );
          setIncomes((prev) =>
            prev.map((i) => assignCategory(i, categoryId, saved)),
          );
        },
      });

    const handleCategoryDelete = (categoryId: string) =>
      runMutation({
        operation: 'deleteCategory',
        shouldSkip,
        errorMessage: t('categories.toasts.deleteFailed'),
        optimistic: () => detachEverywhere(slices, refreshRows, categoryId),
        perform: () => dataService.deleteCategory(categoryId),
      });

    // Alternative to a plain delete: instead of letting the category's
    // expenses go Uncategorized, fold them into toCategory first.
    const handleCategoryMerge = (
      fromCategoryId: string,
      toCategory: Category,
    ) =>
      runMutation({
        operation: 'mergeCategory',
        shouldSkip,
        errorMessage: t('categories.toasts.mergeFailed'),
        optimistic: () => foldEverywhere(slices, fromCategoryId, toCategory),
        perform: () => dataService.mergeCategory(fromCategoryId, toCategory.id),
      });

    // Onboarding writes a starter set. Server-first: a half-applied optimistic
    // list would be worse than a brief wait.
    const handleCategoriesAddBulk = (categoriesData: Partial<Category>[]) =>
      runMutation({
        operation: 'createCategoriesBulk',
        shouldSkip,
        errorMessage: t('categories.toasts.bulkCreateFailed'),
        perform: () =>
          Promise.all(
            categoriesData.map((category) =>
              dataService.createCategory(category, activeOwnerId),
            ),
          ),
        commit: (created) =>
          setCategories((prev) => sortByName([...prev, ...created])),
      });

    return {
      handleCategoryAdd,
      handleCategoryUpdate,
      handleCategoryDelete,
      handleCategoryMerge,
      handleCategoriesAddBulk,
    };
  }, [
    activeOwnerId,
    isInitialized,
    setCategories,
    setExpenses,
    setIncomes,
    setCategoryBudgets,
    refreshExpenses,
    refreshIncomes,
    runMutation,
    t,
  ]);
};

// A category is embedded in every expense and income row that uses it, so an
// edit has to sweep those slices too. Each of these applies the optimistic
// change and returns the rollback that reverses exactly that change, inside
// updaters — an expense logged while the write was in flight survives a
// failure here, where restoring whole-list snapshots used to undo it too.
type CategorySlices = {
  setCategories: Dispatch<SetStateAction<Category[]>>;
  setExpenses: Dispatch<SetStateAction<Expense[]>>;
  setIncomes: Dispatch<SetStateAction<Expense[]>>;
  setCategoryBudgets: Dispatch<SetStateAction<CategoryBudget[]>>;
};

type RefreshRows = {
  refreshExpenses: () => Promise<void>;
  refreshIncomes: () => Promise<void>;
};

const patchEverywhere = (
  slices: CategorySlices,
  categoryId: string,
  categoryData: Partial<Category>,
): (() => void) => {
  let original: Partial<Category> | null = null;

  slices.setCategories((prev) => {
    const current = prev.find((c) => c.id === categoryId);
    if (current) {
      original = pickFields(current, categoryData);
    }

    return sortByName(patchById(prev, categoryId, categoryData));
  });
  slices.setExpenses((prev) =>
    prev.map((e) => mergeCategoryPatch(e, categoryId, categoryData)),
  );
  slices.setIncomes((prev) =>
    prev.map((i) => mergeCategoryPatch(i, categoryId, categoryData)),
  );

  return () => {
    if (!original) {
      return;
    }
    const fields = original;
    slices.setCategories((prev) =>
      sortByName(patchById(prev, categoryId, fields)),
    );
    slices.setExpenses((prev) =>
      prev.map((e) => mergeCategoryPatch(e, categoryId, fields)),
    );
    slices.setIncomes((prev) =>
      prev.map((i) => mergeCategoryPatch(i, categoryId, fields)),
    );
  };
};

const detachEverywhere = (
  slices: CategorySlices,
  refreshRows: RefreshRows,
  categoryId: string,
): (() => void) => {
  const removed = removeCategoryAndBudgets(slices, categoryId);
  slices.setExpenses((prev) =>
    prev.map((e) => clearCategoryRef(e, categoryId)),
  );
  slices.setIncomes((prev) => prev.map((i) => clearCategoryRef(i, categoryId)));

  // The transaction rows had their embedded category stripped; rebuilding
  // those embeds by hand is not this hook's job, so they are refetched
  // (whichever slice the category actually belonged to).
  return () => {
    removed.restore();
    refreshRows.refreshExpenses();
    refreshRows.refreshIncomes();
  };
};

const foldEverywhere = (
  slices: CategorySlices,
  fromCategoryId: string,
  toCategory: Category,
): (() => void) => {
  const removed = removeCategoryAndBudgets(slices, fromCategoryId);
  // Which rows this fold moved, with what they carried before, so the undo
  // moves back those rows and no others.
  const moved = new Map<string, Pick<Expense, 'category_id' | 'category'>>();
  const fold = (prev: Expense[]) =>
    prev.map((row) => {
      if (row.category_id === fromCategoryId) {
        moved.set(row.id, {
          category_id: row.category_id,
          category: row.category,
        });
      }

      return reassignCategoryRef(row, fromCategoryId, toCategory);
    });
  const unfold = (prev: Expense[]) =>
    prev.map((row) => {
      const before = moved.get(row.id);
      if (!before || row.category_id !== toCategory.id) {
        return row;
      }

      return { ...row, ...before };
    });
  slices.setExpenses(fold);
  slices.setIncomes(fold);

  return () => {
    removed.restore();
    slices.setExpenses(unfold);
    slices.setIncomes(unfold);
  };
};

// Takes a category and its budget cap out of the lists, and knows how to put
// back exactly those two.
const removeCategoryAndBudgets = (
  slices: CategorySlices,
  categoryId: string,
) => {
  let category: Category | undefined;
  let budgets: CategoryBudget[] = [];

  slices.setCategories((prev) => {
    category = prev.find((c) => c.id === categoryId);

    return prev.filter((c) => c.id !== categoryId);
  });
  slices.setCategoryBudgets((prev) => {
    budgets = prev.filter((b) => b.category_id === categoryId);

    return prev.filter((b) => b.category_id !== categoryId);
  });

  return {
    restore: () => {
      slices.setCategories((prev) => {
        if (!category || prev.some((c) => c.id === categoryId)) {
          return prev;
        }

        return sortByName([...prev, category]);
      });
      slices.setCategoryBudgets((prev) => {
        const present = new Set(prev.map((b) => b.id));

        return [...prev, ...budgets.filter((b) => !present.has(b.id))];
      });
    },
  };
};

const sortByName = <T extends { name: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.name.localeCompare(b.name));

const mergeCategoryPatch = (
  row: Expense,
  categoryId: string,
  categoryData: Partial<Category>,
): Expense => {
  if (row.category_id !== categoryId || !row.category) {
    return row;
  }

  return { ...row, category: { ...row.category, ...categoryData } };
};

const assignCategory = (
  row: Expense,
  categoryId: string,
  saved: Category,
): Expense => {
  if (row.category_id !== categoryId) {
    return row;
  }

  return { ...row, category: saved };
};

const clearCategoryRef = (row: Expense, categoryId: string): Expense => {
  if (row.category_id !== categoryId) {
    return row;
  }

  return { ...row, category_id: undefined, category: undefined };
};

const reassignCategoryRef = (
  row: Expense,
  fromCategoryId: string,
  toCategory: Category,
): Expense => {
  if (row.category_id !== fromCategoryId) {
    return row;
  }

  return { ...row, category_id: toCategory.id, category: toCategory };
};
