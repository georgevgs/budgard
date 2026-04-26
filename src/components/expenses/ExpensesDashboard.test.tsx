import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

vi.mock('@/contexts/DataContext', () => ({
  useData: () => ({ defaultCurrency: 'EUR' }),
}));

import ExpensesDashboard from './ExpensesDashboard';

const cat = (id: string, name: string, color = '#22c55e'): Category => ({
  id,
  name,
  color,
  icon: null,
  user_id: 'u1',
  created_at: '2026-01-01',
});

const exp = (id: string, amount: number, category_id?: string): Expense => ({
  id,
  amount,
  description: 'x',
  date: '2026-04-01',
  user_id: 'u1',
  created_at: '2026-04-01',
  category_id,
});

describe('ExpensesDashboard', () => {
  it('returns null when no categorized expenses exist', () => {
    const { container } = render(
      <ExpensesDashboard expenses={[]} categories={[cat('a', 'Food')]} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('returns null when expenses have no category_id', () => {
    const { container } = render(
      <ExpensesDashboard
        expenses={[exp('e1', 50)]}
        categories={[cat('a', 'Food')]}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('aggregates and sorts categories by amount descending', () => {
    render(
      <ExpensesDashboard
        expenses={[
          exp('e1', 50, 'food'),
          exp('e2', 200, 'rent'),
          exp('e3', 30, 'food'),
        ]}
        categories={[cat('food', 'Food'), cat('rent', 'Rent')]}
      />,
    );

    const items = screen.getAllByText(/Food|Rent/);
    expect(items[0].textContent).toBe('Rent');
    expect(items[1].textContent).toBe('Food');
  });

  it('filters out categories with zero amount', () => {
    render(
      <ExpensesDashboard
        expenses={[exp('e1', 100, 'food')]}
        categories={[cat('food', 'Food'), cat('rent', 'Rent')]}
      />,
    );

    expect(screen.queryByText('Rent')).not.toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
  });

  it('shows percentage label using i18n keys', () => {
    render(
      <ExpensesDashboard
        expenses={[
          exp('e1', 100, 'food'),
          exp('e2', 0.5, 'rent'),
        ]}
        categories={[cat('food', 'Food'), cat('rent', 'Rent')]}
      />,
    );

    expect(screen.getByText('dashboard.percent')).toBeInTheDocument();
    expect(screen.getByText('dashboard.lessThanOnePercent')).toBeInTheDocument();
  });
});
