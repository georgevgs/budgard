import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  amountToInput,
  formatCurrencyInput,
  parseCurrencyInput,
} from '@/lib/utils';
import {
  useCategoriesData,
  useCategoryBudgetsData,
  useDataConfig,
} from '@/contexts/DataContext';
import { useBudgetOps } from '@/hooks/dataOps/useBudgetOps';
import { useToast } from '@/hooks/useToast';
import type { Category } from '@/types/Category';
import type { CategoryBudget } from '@/types/CategoryBudget';

export type CategoryBudgetTotals = {
  allocated: number;
  withCap: number;
  total: number;
};

// Per-category caps are edited as a sheet of drafts and saved in one go, so
// the whole screen is one unit of work: nothing is written until Save, and a
// single invalid amount blocks the batch rather than half-applying it.
export const useCategoryBudgetDrafts = (
  isOpen: boolean,
  onClose: () => void,
) => {
  const { t } = useTranslation();
  const { expenseCategories } = useCategoriesData();
  const categoryBudgets = useCategoryBudgetsData();
  const { defaultCurrency, monthlyBudget } = useDataConfig();
  const { handleCategoryBudgetUpsert, handleCategoryBudgetDelete } =
    useBudgetOps();
  const { toast } = useToast();

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset drafts whenever the dialog opens or the underlying caps change
  // (e.g. another tab updated them).
  //
  // Starts as null rather than as the current inputs, so a hook that mounts
  // ALREADY open still seeds. Today the manager is always mounted and starts
  // closed, so the false→true transition does the seeding — but a later switch
  // to `{isOpen && <Manager/>}` would otherwise leave every draft empty, and an
  // empty draft against an existing cap reads as "cleared" and deletes it.
  type Inputs = {
    isOpen: boolean;
    expenseCategories: Category[];
    categoryBudgets: CategoryBudget[];
  };
  const [prevInputs, setPrevInputs] = useState<Inputs | null>(null);
  const inputsChanged =
    prevInputs === null ||
    prevInputs.isOpen !== isOpen ||
    prevInputs.expenseCategories !== expenseCategories ||
    prevInputs.categoryBudgets !== categoryBudgets;
  if (inputsChanged) {
    setPrevInputs({ isOpen, expenseCategories, categoryBudgets });
    if (isOpen) {
      setDrafts(
        buildInitialDrafts(expenseCategories, categoryBudgets, defaultCurrency),
      );
      setError(null);
    }
  }

  const sortedCategories = useMemo(
    () => [...expenseCategories].sort((a, b) => a.name.localeCompare(b.name)),
    [expenseCategories],
  );

  const totals = useMemo(
    () => computeTotals(expenseCategories, drafts),
    [expenseCategories, drafts],
  );

  const updateDraft = (categoryId: string, raw: string) => {
    setError(null);
    setDrafts((prev) => ({ ...prev, [categoryId]: formatCurrencyInput(raw) }));
  };

  const clearDraft = (categoryId: string) => {
    setError(null);
    setDrafts((prev) => ({ ...prev, [categoryId]: '' }));
  };

  const handleSave = async () => {
    const diff = computeDiff(expenseCategories, categoryBudgets, drafts);

    if (diff.invalidNames.length > 0) {
      setError(
        t('budget.categoryBudgets.invalidAmountFor', {
          names: diff.invalidNames.join(', '),
        }),
      );

      return;
    }

    if (diff.upserts.length === 0 && diff.deletes.length === 0) {
      onClose();

      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await Promise.all([
        ...diff.upserts.map(({ categoryId, amount }) =>
          handleCategoryBudgetUpsert(categoryId, amount),
        ),
        ...diff.deletes.map((categoryId) =>
          handleCategoryBudgetDelete(categoryId),
        ),
      ]);
      toast({
        variant: 'success',
        title: t('budget.categoryBudgets.savedTitle'),
      });
      onClose();
    } catch {
      // The error toast is raised by useBudgetOps.
    } finally {
      setIsSaving(false);
    }
  };

  return {
    sortedCategories,
    drafts,
    totals,
    monthlyBudget,
    defaultCurrency,
    isSaving,
    error,
    updateDraft,
    clearDraft,
    handleSave,
  };
};

// --- Helpers ---

type Diff = {
  upserts: { categoryId: string; amount: number }[];
  deletes: string[];
  invalidNames: string[];
};

const buildInitialDrafts = (
  categories: Category[],
  budgets: CategoryBudget[],
  currency: string,
): Record<string, string> => {
  const map: Record<string, string> = {};
  const byCategoryId = new Map(budgets.map((b) => [b.category_id, b]));

  for (const cat of categories) {
    const existing = byCategoryId.get(cat.id);
    if (existing) {
      map[cat.id] = amountToInput(existing.monthly_amount, currency);
      continue;
    }
    map[cat.id] = '';
  }

  return map;
};

const computeTotals = (
  categories: Category[],
  drafts: Record<string, string>,
) => {
  let allocated = 0;
  let withCap = 0;

  for (const cat of categories) {
    const raw = drafts[cat.id] ?? '';
    if (!raw) continue;
    const amount = parseCurrencyInput(raw);
    if (amount > 0) {
      allocated += amount;
      withCap += 1;
    }
  }

  return { allocated, withCap, total: categories.length };
};

const computeDiff = (
  categories: Category[],
  budgets: CategoryBudget[],
  drafts: Record<string, string>,
): Diff => {
  const byCategoryId = new Map(budgets.map((b) => [b.category_id, b]));
  const upserts: { categoryId: string; amount: number }[] = [];
  const deletes: string[] = [];
  const invalidNames: string[] = [];

  for (const cat of categories) {
    const raw = drafts[cat.id] ?? '';
    const existing = byCategoryId.get(cat.id);

    if (raw === '') {
      if (existing) deletes.push(cat.id);
      continue;
    }

    const amount = parseCurrencyInput(raw);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
      invalidNames.push(cat.name);
      continue;
    }

    if (!existing || existing.monthly_amount !== amount) {
      upserts.push({ categoryId: cat.id, amount });
    }
  }

  return { upserts, deletes, invalidNames };
};
