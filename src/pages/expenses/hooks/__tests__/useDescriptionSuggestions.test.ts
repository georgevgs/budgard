import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { useDescriptionSuggestions } from '@/pages/expenses/hooks/useDescriptionSuggestions';
import type { ExpenseFormData } from '@/pages/expenses/validations';
import type { Expense } from '@/types/Expense';

const expenses: Expense[] = [
  {
    id: 'expense-1',
    amount: 10,
    description: 'Letta',
    date: '2026-09-20',
    category_id: 'category-1',
    tag_id: 'tag-1',
    user_id: 'user-1',
    created_at: '2026-09-20T12:00:00.000Z',
  },
];

vi.mock('@/common/contexts/DataContext', () => ({
  useExpensesData: () => expenses,
}));

describe('useDescriptionSuggestions', () => {
  it('offers an exact name and applies its saved category and tag', () => {
    const { result } = renderHook(() => {
      const form = useForm<ExpenseFormData>({
        defaultValues: { description: '', category_id: 'none' },
      });

      return { form, suggestions: useDescriptionSuggestions(form) };
    });

    act(() => {
      result.current.form.setValue('description', 'Lett');
      result.current.suggestions.setAreSuggestionsOpen(true);
    });
    expect(result.current.suggestions.filteredSuggestions).toEqual(expenses);

    act(() => {
      result.current.form.setValue('description', 'Letta');
    });
    expect(result.current.suggestions.isPopoverOpen).toBe(true);
    expect(result.current.suggestions.filteredSuggestions).toEqual(expenses);

    act(() => {
      result.current.suggestions.handleSuggestionSelect(expenses[0]);
    });
    expect(result.current.form.getValues()).toEqual(
      expect.objectContaining({
        description: 'Letta',
        category_id: 'category-1',
        tag_id: 'tag-1',
      }),
    );
  });
});
