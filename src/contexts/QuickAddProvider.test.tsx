import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/layout/SpeedDial', () => ({
  default: () => <div data-testid="speed-dial" />,
}));

vi.mock('@/components/layout/FormsManager', () => ({ default: () => null }));
vi.mock('@/components/income/IncomeFormDialog', () => ({ default: () => null }));

vi.mock('@/contexts/DataContext', () => ({
  useDataConfig: () => ({ isInitialized: true }),
}));

vi.mock('@/hooks/dataOps/useIncomeOps', () => ({
  useIncomeOps: () => ({ handleIncomeDelete: vi.fn() }),
}));

vi.mock('@/hooks/expensesList/useOpenFormFromUrl', () => ({
  useOpenFormFromUrl: () => undefined,
}));

vi.mock('@/hooks/expensesList/useOptimisticExpenseActions', () => ({
  useOptimisticExpenseActions: () => ({
    optimisticExpenses: [],
    handleExpenseDelete: vi.fn(),
    handleExpenseFormSubmit: vi.fn(),
    handleSaveAsTemplate: vi.fn(),
    handleUseTemplate: vi.fn(),
  }),
}));

import QuickAddProvider from '@/contexts/QuickAddProvider';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <QuickAddProvider>
        <div />
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
});
