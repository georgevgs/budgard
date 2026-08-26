import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';

const data = vi.hoisted(() => {
  const category = (id: string, name: string): Category => ({
    id,
    name,
    color: '#000000',
    icon: null,
    user_id: 'user-1',
    created_at: '2026-01-01T00:00:00.000Z',
  });

  const expense = (
    id: string,
    description: string,
    categoryId: string | null,
    createdAt: string,
  ): Expense => ({
    id,
    amount: 4,
    description,
    date: '2026-08-20',
    category_id: categoryId,
    user_id: 'user-1',
    created_at: createdAt,
  });

  return {
    categories: [category('cat-food', 'Food'), category('cat-fun', 'Fun')],
    expenses: [
      expense('exp-1', 'Flat white', 'cat-food', '2026-08-20T09:00:00.000Z'),
      expense('exp-2', 'Cinema', 'cat-fun', '2026-08-19T09:00:00.000Z'),
    ],
  };
});

const receiptScan = vi.hoisted(() => ({
  file: null as File | null,
  options: undefined as
    | {
        receiptFile: File;
        removeExistingReceipt: boolean;
        existingReceiptPath: null;
      }
    | undefined,
}));

vi.mock('@/contexts/DataContext', () => ({
  useCategoriesData: () => ({ expenseCategories: data.categories }),
  useDataConfig: () => ({ defaultCurrency: 'EUR' }),
  useExpensesData: () => data.expenses,
  useTemplatesData: () => [],
}));

vi.mock('@/hooks/dataOps/useTemplateOps', () => ({
  useTemplateOps: () => ({ handleTemplateDelete: vi.fn() }),
}));

vi.mock('@/hooks/expenseForm/useQuickReceiptScan', () => ({
  useQuickReceiptScan: () => ({
    inputRef: { current: null },
    receiptFile: receiptScan.file,
    isScanning: false,
    progress: 0,
    receiptOptions: receiptScan.options,
    openPicker: vi.fn(),
    handleChange: vi.fn(),
    cancel: vi.fn(),
  }),
}));

// Radix portals need pointer APIs jsdom does not implement. Both stand-ins
// keep the assertions on what the sheet does, not on how Radix positions it —
// the popover still reports whether it would be open.
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ open, children }: { open: boolean; children: ReactNode }) => (
    <div data-testid="suggestions" data-open={String(open)}>
      {children}
    </div>
  ),
  PopoverAnchor: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import QuickAddSheet from '@/components/expenses/QuickAddSheet';

const renderSheet = () => {
  const onSubmit = vi.fn();
  const onOpenFullForm = vi.fn();
  render(
    <QuickAddSheet
      open
      onClose={vi.fn()}
      onSubmit={onSubmit}
      onOpenFullForm={onOpenFullForm}
      onUseTemplate={vi.fn()}
    />,
  );

  return { onSubmit, onOpenFullForm };
};

const typeAmount = () => {
  fireEvent.click(screen.getByRole('button', { name: '4' }));
  fireEvent.click(screen.getByRole('button', { name: '0' }));
  fireEvent.click(screen.getByRole('button', { name: '0' }));
};

const nameField = () =>
  screen.getByRole('textbox', { name: 'expenses.quickAdd.nameLabel' });

beforeEach(() => {
  receiptScan.file = null;
  receiptScan.options = undefined;
});

describe('components/expenses/QuickAddSheet', () => {
  it('saves the typed name as the description', () => {
    const { onSubmit } = renderSheet();

    typeAmount();
    fireEvent.change(nameField(), { target: { value: 'Flat white' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 4, description: 'Flat white' }),
    );
  });

  // The name is the point of this change, but it stays optional — an unnamed
  // expense still has to end up with a readable label.
  it('falls back to the category name when nothing is typed', () => {
    const { onSubmit } = renderSheet();

    typeAmount();
    fireEvent.click(screen.getByRole('radio', { name: 'Food' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Food', category_id: 'cat-food' }),
    );
  });

  it('fills the name and adopts the category from a recent suggestion', () => {
    const { onSubmit } = renderSheet();

    typeAmount();
    fireEvent.focus(nameField());
    fireEvent.click(screen.getByRole('button', { name: 'Cinema' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    expect(nameField()).toHaveValue('Cinema');
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Cinema',
        category_id: 'cat-fun',
      }),
    );
  });

  it('narrows the empty-field suggestions to the chosen category', () => {
    renderSheet();

    fireEvent.click(screen.getByRole('radio', { name: 'Food' }));
    const list = screen.getByTestId('suggestions');

    expect(
      within(list).getByRole('button', { name: 'Flat white' }),
    ).toBeInTheDocument();
    expect(within(list).queryByRole('button', { name: 'Cinema' })).toBeNull();
  });

  it('carries the typed name into the full form', () => {
    const { onOpenFullForm } = renderSheet();

    typeAmount();
    fireEvent.change(nameField(), { target: { value: 'Taxi home' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.quickAdd.moreDetails' }),
    );

    expect(onOpenFullForm).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Taxi home' }),
    );
  });

  it('keeps a scanned receipt attached when opening the full form', () => {
    const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
    receiptScan.file = file;
    const { onOpenFullForm } = renderSheet();

    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.quickAdd.moreDetails' }),
    );

    expect(onOpenFullForm).toHaveBeenCalledWith(expect.any(Object), file);
  });

  it('blocks a name the full expense form would reject', () => {
    renderSheet();

    typeAmount();
    fireEvent.change(nameField(), { target: { value: 'A < B' } });

    expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled();
    expect(
      screen.getByText('validation.descriptionInvalid'),
    ).toBeInTheDocument();
  });
});
