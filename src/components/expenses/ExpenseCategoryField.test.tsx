import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useForm, useWatch } from 'react-hook-form';
import type { Category } from '@/types/Category';
import type { ExpenseFormData } from '@/lib/validations';

// The real Select is a Radix portal driven by pointer events that jsdom does
// not implement. A plain listbox keeps the assertions about *behaviour* —
// which option exists, and what selecting it does — rather than about Radix.
vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: ReactNode;
    onValueChange: (value: string) => void;
  }) => (
    <div
      data-testid="select"
      onClick={(event) => {
        const option = (event.target as HTMLElement).closest('[data-value]');
        const value = (option as HTMLElement | null)?.dataset.value;
        if (value) onValueChange(value);
      }}
    >
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <button type="button" data-value={value}>
      {children}
    </button>
  ),
}));

import { Form } from '@/components/ui/form';
import ExpenseCategoryField from '@/components/expenses/ExpenseCategoryField';

const categories: Category[] = [
  {
    id: 'c1',
    user_id: 'u1',
    name: 'Groceries',
    color: '#ff0000',
    icon: '🛒',
    created_at: '2026-01-01',
  } as Category,
];

// The selected id is rendered into the DOM rather than captured out through a
// ref, so the assertions read the same value a user's screen would show.
type HarnessProps = {
  onManageCategories: () => void;
};

const Harness = ({ onManageCategories }: HarnessProps) => {
  const form = useForm<ExpenseFormData>({
    defaultValues: { category_id: 'none' },
  });
  const selected = useWatch({ control: form.control, name: 'category_id' });

  return (
    <Form {...form}>
      <ExpenseCategoryField
        form={form}
        categories={categories}
        onManageCategories={onManageCategories}
      />
      <output data-testid="selected">{selected}</output>
    </Form>
  );
};

describe('expenses/ExpenseCategoryField', () => {
  it('selects a real category without opening the manager', () => {
    const onManageCategories = vi.fn();
    render(<Harness onManageCategories={onManageCategories} />);

    fireEvent.click(screen.getByText('Groceries'));

    expect(screen.getByTestId('selected')).toHaveTextContent('c1');
    expect(onManageCategories).not.toHaveBeenCalled();
  });

  it('opens the category manager instead of selecting the sentinel option', () => {
    const onManageCategories = vi.fn();
    render(<Harness onManageCategories={onManageCategories} />);

    fireEvent.click(screen.getByText('categories.manageCategories'));

    expect(onManageCategories).toHaveBeenCalledOnce();
    expect(screen.getByTestId('selected')).toHaveTextContent('none');
  });
});
