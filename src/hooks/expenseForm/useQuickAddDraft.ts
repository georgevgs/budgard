import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategoriesData, useDataConfig } from '@/contexts/DataContext';
import { useExpensesData } from '@/contexts/DataContext';
import { useAmountPad } from '@/hooks/expenseForm/useAmountPad';
import type { Category } from '@/types/Category';
import type { ExpenseWritePayload } from '@/services/dataService';

const RECENT_WINDOW = 60;
const CHIP_LIMIT = 8;

type Params = {
  isOpen: boolean;
  onSubmit: (data: ExpenseWritePayload) => void;
  onClose: () => void;
};

export const useQuickAddDraft = ({ isOpen, onSubmit, onClose }: Params) => {
  const { t } = useTranslation();
  const { expenseCategories } = useCategoriesData();
  const { defaultCurrency } = useDataConfig();
  const expenses = useExpensesData();
  const pad = useAmountPad();
  const [categoryId, setCategoryId] = useState<string | null>(null);

  // Reopening starts clean. Recorded during render rather than in an effect so
  // the first frame after opening never shows the previous amount.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      pad.clear();
      setCategoryId(null);
    }
  }

  const categories = useMemo(
    () => rankByRecentUse(expenseCategories, expenses),
    [expenseCategories, expenses],
  );

  const submit = () => {
    if (pad.isEmpty) {
      return;
    }

    onSubmit({
      amount: pad.amount,
      description: describe(categoryId, categories, t),
      category_id: categoryId,
      date: new Date().toISOString().slice(0, 10),
    });
    onClose();
  };

  return {
    pad,
    categories: categories.slice(0, CHIP_LIMIT),
    categoryId,
    currency: defaultCurrency,
    canSave: !pad.isEmpty,
    selectCategory: setCategoryId,
    submit,
    // Everything the pad captured, handed to the full form so switching to it
    // never costs the user what they already typed.
    toFullForm: (): ExpenseWritePayload => ({
      amount: pad.amount,
      category_id: categoryId,
      date: new Date().toISOString().slice(0, 10),
    }),
  };
};

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

// The description stays optional on this screen — asking for one is the step
// that makes logging a coffee feel like paperwork. A row still needs a label
// to be readable in a list, so the category supplies it.
const describe = (
  categoryId: string | null,
  categories: Category[],
  t: TFunc,
): string => {
  const category = categories.find((item) => item.id === categoryId);
  if (category) {
    return category.name;
  }

  return t('expenses.quickAdd.untitled');
};

// Most-used-recently first: the category you reached for yesterday is
// overwhelmingly the one you want now, and an alphabetical grid buries it.
const rankByRecentUse = (
  categories: Category[],
  expenses: { category_id?: string | null; date: string }[],
): Category[] => {
  const cutoff = new Date(Date.now() - RECENT_WINDOW * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const uses = new Map<string, number>();

  for (const expense of expenses) {
    if (!expense.category_id || expense.date < cutoff) {
      continue;
    }
    uses.set(expense.category_id, (uses.get(expense.category_id) ?? 0) + 1);
  }

  return [...categories].sort((a, b) => {
    const difference = (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0);
    if (difference !== 0) {
      return difference;
    }

    return a.name.localeCompare(b.name);
  });
};
