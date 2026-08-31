import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import type { CategoryBudget } from '@/types/CategoryBudget';
import { patchById, replaceById } from '@/hooks/dataOps/helpers';
import { useMutationRunner } from '@/hooks/dataOps/useMutationRunner';
import { useFinancialSpace } from '@/contexts/FinancialSpaceContext';

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
    const skip = !isInitialized;

    const handleCategoryAdd = (categoryData: Partial<Category>) => {
      const optimistic = {
        ...categoryData,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
      } as Category;

      return runMutation({
        operation: 'createCategory',
        skip,
        errorMessage: t('categories.toasts.addFailed'),
        optimistic: () => {
          setCategories((prev) => [...prev, optimistic]);

          return () =>
            setCategories((prev) => prev.filter((c) => c.id !== optimistic.id));
        },
        perform: () => dataService.createCategory(categoryData, activeOwnerId),
        commit: (saved) =>
          setCategories((prev) =>
            sortByName([
              ...prev.filter((c) => c.id !== optimistic.id),
              saved,
            ]),
          ),
      });
    };

    const handleCategoryUpdate = (
      categoryId: string,
      categoryData: Partial<Category>,
    ) =>
      runMutation({
        operation: 'updateCategory',
        skip,
        errorMessage: t('categories.toasts.updateFailed'),
        optimistic: () => {
          let previousCategories: Category[] = [];
          let previousExpenses: Expense[] = [];
          let previousIncomes: Expense[] = [];

          setCategories((prev) => {
            previousCategories = prev;

            return sortByName(patchById(prev, categoryId, categoryData));
          });
          setExpenses((prev) => {
            previousExpenses = prev;

            return prev.map((e) =>
              mergeCategoryPatch(e, categoryId, categoryData),
            );
          });
          setIncomes((prev) => {
            previousIncomes = prev;

            return prev.map((i) =>
              mergeCategoryPatch(i, categoryId, categoryData),
            );
          });

          return () => {
            setCategories(previousCategories);
            setExpenses(previousExpenses);
            setIncomes(previousIncomes);
          };
        },
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
        skip,
        errorMessage: t('categories.toasts.deleteFailed'),
        optimistic: () => {
          let previousCategories: Category[] = [];
          let previousBudgets: CategoryBudget[] = [];

          setCategories((prev) => {
            previousCategories = prev;

            return prev.filter((c) => c.id !== categoryId);
          });
          setExpenses((prev) =>
            prev.map((e) => clearCategoryRef(e, categoryId)),
          );
          setIncomes((prev) =>
            prev.map((i) => clearCategoryRef(i, categoryId)),
          );
          setCategoryBudgets((prev) => {
            previousBudgets = prev;

            return prev.filter((b) => b.category_id !== categoryId);
          });

          // The transaction rows had their embedded category stripped;
          // rebuilding those embeds by hand is not this hook's job, so they
          // are refetched (whichever slice the category actually belonged to).
          return () => {
            setCategories(previousCategories);
            setCategoryBudgets(previousBudgets);
            refreshExpenses();
            refreshIncomes();
          };
        },
        perform: () => dataService.deleteCategory(categoryId),
      });

    // Alternative to a plain delete: instead of letting the category's
    // expenses go Uncategorized, fold them into toCategory first.
    const handleCategoryMerge = (fromCategoryId: string, toCategory: Category) =>
      runMutation({
        operation: 'mergeCategory',
        skip,
        errorMessage: t('categories.toasts.mergeFailed'),
        optimistic: () => {
          let previousCategories: Category[] = [];
          let previousExpenses: Expense[] = [];
          let previousIncomes: Expense[] = [];
          let previousBudgets: CategoryBudget[] = [];

          setCategories((prev) => {
            previousCategories = prev;

            return prev.filter((c) => c.id !== fromCategoryId);
          });
          setExpenses((prev) => {
            previousExpenses = prev;

            return prev.map((e) =>
              reassignCategoryRef(e, fromCategoryId, toCategory),
            );
          });
          setIncomes((prev) => {
            previousIncomes = prev;

            return prev.map((i) =>
              reassignCategoryRef(i, fromCategoryId, toCategory),
            );
          });
          setCategoryBudgets((prev) => {
            previousBudgets = prev;

            return prev.filter((b) => b.category_id !== fromCategoryId);
          });

          return () => {
            setCategories(previousCategories);
            setExpenses(previousExpenses);
            setIncomes(previousIncomes);
            setCategoryBudgets(previousBudgets);
          };
        },
        perform: () => dataService.mergeCategory(fromCategoryId, toCategory.id),
      });

    // Onboarding writes a starter set. Server-first: a half-applied optimistic
    // list would be worse than a brief wait.
    const handleCategoriesAddBulk = (categoriesData: Partial<Category>[]) =>
      runMutation({
        operation: 'createCategoriesBulk',
        skip,
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

// --- Helpers ---

const sortByName = <T extends { name: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.name.localeCompare(b.name));


const mergeCategoryPatch = (
  row: Expense,
  categoryId: string,
  categoryData: Partial<Category>,
): Expense => {
  if (row.category_id !== categoryId || !row.category) return row;

  return { ...row, category: { ...row.category, ...categoryData } };
};

const assignCategory = (
  row: Expense,
  categoryId: string,
  saved: Category,
): Expense => {
  if (row.category_id !== categoryId) return row;

  return { ...row, category: saved };
};

const clearCategoryRef = (row: Expense, categoryId: string): Expense => {
  if (row.category_id !== categoryId) return row;

  return { ...row, category_id: undefined, category: undefined };
};

const reassignCategoryRef = (
  row: Expense,
  fromCategoryId: string,
  toCategory: Category,
): Expense => {
  if (row.category_id !== fromCategoryId) return row;

  return { ...row, category_id: toCategory.id, category: toCategory };
};
