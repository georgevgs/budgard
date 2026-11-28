import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import TodayActions from '@/pages/today/components/TodayActions/TodayActions';

const quickAdd = vi.hoisted(() => ({
  openExpenseEntry: vi.fn(),
  openIncomeEntry: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/common/contexts/QuickAddContext', () => ({
  useQuickAdd: () => quickAdd,
}));

const renderActions = () =>
  render(
    <MemoryRouter>
      <TodayActions />
    </MemoryRouter>,
  );

describe('TodayActions', () => {
  it('opens the expense keypad and the income form', () => {
    renderActions();

    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.addExpense' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'income.addIncome' }));

    expect(quickAdd.openExpenseEntry).toHaveBeenCalledTimes(1);
    expect(quickAdd.openIncomeEntry).toHaveBeenCalledTimes(1);
  });

  it('links to recurring bills and goals', () => {
    renderActions();

    expect(
      screen.getByRole('link', { name: 'navigation.recurring' }),
    ).toHaveAttribute('href', '/recurring');
    expect(
      screen.getByRole('link', { name: 'navigation.goals' }),
    ).toHaveAttribute('href', '/goals');
  });
});
