import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

type SpeedDialProps = { onAddExpense: () => void; onAddIncome: () => void };

vi.mock('@/common/components/layout/SpeedDial', () => ({
  SpeedDial: ({ onAddExpense, onAddIncome }: SpeedDialProps) => (
    <div data-testid="speed-dial">
      <button onClick={onAddExpense}>add expense</button>
      <button onClick={onAddIncome}>add income</button>
    </div>
  ),
}));

// These two render a marker rather than null: the point of the tests below is
// whether the module is mounted at all, not what it draws.
vi.mock('@/common/components/layout/FormsManager', () => ({
  FormsManager: () => <div data-testid="expense-form" />,
}));
vi.mock('@/pages/expenses/components/QuickAddSheet', () => ({ QuickAddSheet: () => null }));
vi.mock('@/pages/income/components/IncomeFormDialog', () => ({
  IncomeFormDialog: () => <div data-testid="income-form" />,
}));

vi.mock('@/common/contexts/DataContext', () => ({
  useDataConfig: () => ({ isInitialized: true, defaultCurrency: 'EUR' }),
  // The quick-add sheet ranks category chips by recent use, so the provider
  // now pulls both of these through.
  useCategoriesData: () => ({ expenseCategories: [] }),
  useExpensesData: () => [],
}));

vi.mock('@/common/hooks/dataOps/useIncomeOps', () => ({
  useIncomeOps: () => ({ handleIncomeDelete: vi.fn() }),
}));

vi.mock('@/pages/expenses/hooks/useOpenFormFromUrl', () => ({
  useOpenFormFromUrl: () => undefined,
}));

vi.mock('@/pages/expenses/hooks/useOptimisticExpenseActions', () => ({
  useOptimisticExpenseActions: () => ({
    optimisticExpenses: [],
    handleExpenseDelete: vi.fn(),
    handleExpenseFormSubmit: vi.fn(),
    handleSaveAsTemplate: vi.fn(),
    handleUseTemplate: vi.fn(),
  }),
}));

import { QuickAddProvider } from '@/common/contexts/QuickAddProvider';
import { useQuickAdd } from '@/common/contexts/QuickAddContext';
import type { Expense } from '@/types/Expense';

// The FAB opens the keypad sheet, not the full form — the full expense form is
// only reached by "More details" or by editing a row. Editing is the shorter
// of the two to drive from here.
const EditExpenseButton = () => {
  const { handleExpenseEdit } = useQuickAdd();

  return (
    <button onClick={() => handleExpenseEdit({ id: 'e1' } as Expense)}>
      edit expense
    </button>
  );
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <QuickAddProvider>
        <EditExpenseButton />
      </QuickAddProvider>
    </MemoryRouter>,
  );

describe('contexts/QuickAddProvider', () => {
  it('offers the quick-add button on the transaction screens', () => {
    for (const path of ['/today', '/activity']) {
      const view = renderAt(path);

      expect(view.getByTestId('speed-dial')).toBeInTheDocument();
      view.unmount();
    }
  });

  // Being a tab is not the test — owning the action is. Plan is where you set
  // a budget, Trends is a report, Settings logs nothing, and the last four
  // each own a different add button that would collide in the same dock slot.
  it('stays off screens whose primary action is not logging a transaction', () => {
    for (const path of [
      '/plan',
      '/trends',
      '/settings',
      '/networth',
      '/debts',
      '/goals',
      '/recurring',
    ]) {
      const view = renderAt(path);

      expect(screen.queryByTestId('speed-dial')).toBeNull();
      view.unmount();
    }
  });

  // The full forms carry react-hook-form, the date picker and the Zod feature
  // schemas, so they are lazy and must not be mounted by the shell itself —
  // and must still arrive when someone actually asks for one.
  it.each([
    ['edit expense', 'expense-form'],
    ['add income', 'income-form'],
  ])('mounts the full form only once %s is pressed', async (label, testId) => {
    renderAt('/today');

    expect(screen.queryByTestId(testId)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: label }));

    expect(await screen.findByTestId(testId)).toBeInTheDocument();
  });
});
