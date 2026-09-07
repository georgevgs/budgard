import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataActions, useDataConfig } from '@/common/contexts/DataContext';
import { dataService } from '@/common/api/dataService';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import type { CategoryBudget } from '@/types/CategoryBudget';
import { patchById, replaceById } from '@/common/hooks/dataOps/helpers';
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
// change and returns the rollback that puts every slice back as it was.
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
  let previousCategories: Category[] = [];
  let previousExpenses: Expense[] = [];
  let previousIncomes: Expense[] = [];

  slices.setCategories((prev) => {
    previousCategories = prev;

    return sortByName(patchById(prev, categoryId, categoryData));
  });
  slices.setExpenses((prev) => {
    previousExpenses = prev;

    return prev.map((e) => mergeCategoryPatch(e, categoryId, categoryData));
  });
  slices.setIncomes((prev) => {
    previousIncomes = prev;

    return prev.map((i) => mergeCategoryPatch(i, categoryId, categoryData));
  });

  return () => {
    slices.setCategories(previousCategories);
    slices.setExpenses(previousExpenses);
    slices.setIncomes(previousIncomes);
  };
};

const detachEverywhere = (
  slices: CategorySlices,
  refreshRows: RefreshRows,
  categoryId: string,
): (() => void) => {
  let previousCategories: Category[] = [];
  let previousBudgets: CategoryBudget[] = [];

  slices.setCategories((prev) => {
    previousCategories = prev;

    return prev.filter((c) => c.id !== categoryId);
  });
  slices.setExpenses((prev) =>
    prev.map((e) => clearCategoryRef(e, categoryId)),
  );
  slices.setIncomes((prev) => prev.map((i) => clearCategoryRef(i, categoryId)));
  slices.setCategoryBudgets((prev) => {
    previousBudgets = prev;

    return prev.filter((b) => b.category_id !== categoryId);
  });

  // The transaction rows had their embedded category stripped; rebuilding
  // those embeds by hand is not this hook's job, so they are refetched
  // (whichever slice the category actually belonged to).
  return () => {
    slices.setCategories(previousCategories);
    slices.setCategoryBudgets(previousBudgets);
    refreshRows.refreshExpenses();
    refreshRows.refreshIncomes();
  };
};

const foldEverywhere = (
  slices: CategorySlices,
  fromCategoryId: string,
  toCategory: Category,
): (() => void) => {
  let previousCategories: Category[] = [];
  let previousExpenses: Expense[] = [];
  let previousIncomes: Expense[] = [];
  let previousBudgets: CategoryBudget[] = [];

  slices.setCategories((prev) => {
    previousCategories = prev;

    return prev.filter((c) => c.id !== fromCategoryId);
  });
  slices.setExpenses((prev) => {
    previousExpenses = prev;

    return prev.map((e) => reassignCategoryRef(e, fromCategoryId, toCategory));
  });
  slices.setIncomes((prev) => {
    previousIncomes = prev;

    return prev.map((i) => reassignCategoryRef(i, fromCategoryId, toCategory));
  });
  slices.setCategoryBudgets((prev) => {
    previousBudgets = prev;

    return prev.filter((b) => b.category_id !== fromCategoryId);
  });

  return () => {
    slices.setCategories(previousCategories);
    slices.setExpenses(previousExpenses);
    slices.setIncomes(previousIncomes);
    slices.setCategoryBudgets(previousBudgets);
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
