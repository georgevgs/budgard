import { useMemo, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useExpensesData } from '@/contexts/DataContext';
import type { ExpenseFormData } from '@/lib/validations';
import type { Expense } from '@/types/Expense';

export const useDescriptionSuggestions = (
  form: UseFormReturn<ExpenseFormData>,
) => {
  const allExpenses = useExpensesData();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const descriptionValue = form.watch('description');

  const suggestions = useMemo(() => {
    const seen = new Map<string, Expense>();
    const sorted = [...allExpenses].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    for (const expense of sorted) {
      const key = expense.description.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, expense);
      }
    }

    return Array.from(seen.values());
  }, [allExpenses]);

  const filteredSuggestions = useMemo(() => {
    const query = descriptionValue.trim().toLowerCase();
    if (!query) return [];

    return suggestions
      .filter((s) => {
        const desc = s.description.toLowerCase();

        return desc.includes(query) && desc !== query;
      })
      .slice(0, 5);
  }, [suggestions, descriptionValue]);

  const handleSuggestionSelect = (selected: Expense) => {
    form.setValue('description', selected.description, { shouldValidate: true, shouldDirty: true });
    form.setValue('category_id', selected.category_id ?? 'none', { shouldValidate: true, shouldDirty: true });
    form.setValue('tag_id', selected.tag_id ?? undefined, { shouldValidate: true, shouldDirty: true });
    setSuggestionsOpen(false);
  };

  const isPopoverOpen = suggestionsOpen && filteredSuggestions.length > 0;

  return {
    isPopoverOpen,
    setSuggestionsOpen,
    filteredSuggestions,
    handleSuggestionSelect,
  };
};

export type DescriptionSuggestionsApi = ReturnType<
  typeof useDescriptionSuggestions
>;
