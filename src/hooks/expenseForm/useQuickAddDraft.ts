import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategoriesData, useDataConfig } from '@/contexts/DataContext';
import { useExpensesData } from '@/contexts/DataContext';
import { useAmountPad } from '@/hooks/expenseForm/useAmountPad';
import { toIsoDate, todayIso } from '@/lib/dates';
import { expenseDescriptionSchema } from '@/lib/validations';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import type { ExpenseWritePayload } from '@/services/dataService';
import type { ReceiptOptions } from '@/hooks/dataOps/useExpenseOps';

const RECENT_WINDOW = 60;
const CHIP_LIMIT = 8;
const NAME_LIMIT = 100;
const SUGGESTION_LIMIT = 5;

type Params = {
  isOpen: boolean;
  onSubmit: (
    data: ExpenseWritePayload,
    expenseId?: string,
    receiptOptions?: ReceiptOptions,
  ) => void;
  onClose: () => void;
};

export const useQuickAddDraft = ({ isOpen, onSubmit, onClose }: Params) => {
  const { t } = useTranslation();
  const { expenseCategories } = useCategoriesData();
  const { defaultCurrency } = useDataConfig();
  const expenses = useExpensesData();
  const pad = useAmountPad();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState(todayIso);

  // Reopening starts clean. Recorded during render rather than in an effect so
  // the first frame after opening never shows the previous amount.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      pad.clear();
      setCategoryId(null);
      setName('');
      setDate(todayIso());
    }
  }

  const categories = useMemo(
    () => rankByRecentUse(expenseCategories, expenses),
    [expenseCategories, expenses],
  );

  const recentNames = useMemo(() => distinctRecentNames(expenses), [expenses]);

  const suggestions = useMemo(
    () => matchNames(recentNames, name, categoryId),
    [recentNames, name, categoryId],
  );
  const descriptionResult = expenseDescriptionSchema.safeParse(
    describe(name, categoryId, categories, t),
  );
  let nameErrorKey: string | null = null;
  if (!descriptionResult.success) {
    nameErrorKey =
      descriptionResult.error.issues[0]?.message ??
      'validation.descriptionInvalid';
  }

  const submit = (receiptOptions?: ReceiptOptions) => {
    if (pad.isEmpty || !descriptionResult.success) {
      return;
    }

    const payload = {
      amount: pad.amount,
      description: descriptionResult.data,
      category_id: categoryId,
      date,
    };
    if (receiptOptions) {
      onSubmit(payload, undefined, receiptOptions);
    } else {
      onSubmit(payload);
    }
    onClose();
  };

  // A suggestion carries the category it was last filed under, but only fills
  // an empty slot — re-categorising a chip the user just tapped would be the
  // screen arguing with them.
  const applySuggestion = (suggestion: Expense) => {
    setName(suggestion.description.slice(0, NAME_LIMIT));
    if (!categoryId && suggestion.category_id) {
      setCategoryId(suggestion.category_id);
    }
  };

  return {
    pad,
    categories: categories.slice(0, CHIP_LIMIT),
    categoryId,
    name,
    date,
    suggestions,
    currency: defaultCurrency,
    canSave: !pad.isEmpty && descriptionResult.success,
    nameErrorKey,
    selectCategory: setCategoryId,
    setName: (value: string) => setName(value.slice(0, NAME_LIMIT)),
    setDate,
    applySuggestion,
    submit,
    // Everything the pad captured, handed to the full form so switching to it
    // never costs the user what they already typed.
    toFullForm: (): ExpenseWritePayload => ({
      amount: pad.amount,
      description: name.trim(),
      category_id: categoryId,
      date,
    }),
  };
};

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

// A typed name always wins. It stays optional because asking for one is the
// step that makes logging a coffee feel like paperwork — but a row needs a
// label to be readable in a list, so the category stands in when it is blank.
const describe = (
  name: string,
  categoryId: string | null,
  categories: Category[],
  t: TFunc,
): string => {
  const typed = name.trim();
  if (typed) {
    return typed;
  }

  const category = categories.find((item) => item.id === categoryId);
  if (category) {
    return category.name;
  }

  return t('expenses.quickAdd.untitled');
};

// One entry per distinct name, newest first — the same shape the full form's
// description field offers, so the two screens suggest the same things.
const distinctRecentNames = (expenses: Expense[]): Expense[] => {
  const seen = new Map<string, Expense>();
  const newestFirst = [...expenses].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  for (const expense of newestFirst) {
    const key = expense.description.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.set(key, expense);
    }
  }

  return Array.from(seen.values());
};

// With nothing typed the list is a shortcut rather than an autocomplete: the
// names last filed under the chosen category, which is the whole reason the
// category is picked first. Typing narrows it the ordinary way.
const matchNames = (
  recent: Expense[],
  query: string,
  categoryId: string | null,
): Expense[] => {
  const typed = query.trim().toLowerCase();

  if (!typed) {
    return withinCategory(recent, categoryId).slice(0, SUGGESTION_LIMIT);
  }

  return recent
    .filter((expense) => {
      const description = expense.description.toLowerCase();

      return description.includes(typed) && description !== typed;
    })
    .slice(0, SUGGESTION_LIMIT);
};

const withinCategory = (
  recent: Expense[],
  categoryId: string | null,
): Expense[] => {
  if (!categoryId) {
    return recent;
  }

  return recent.filter((expense) => expense.category_id === categoryId);
};

// Most-used-recently first: the category you reached for yesterday is
// overwhelmingly the one you want now, and an alphabetical grid buries it.
const rankByRecentUse = (
  categories: Category[],
  expenses: { category_id?: string | null; date: string }[],
): Category[] => {
  const cutoff = toIsoDate(new Date(Date.now() - RECENT_WINDOW * 86_400_000));
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
