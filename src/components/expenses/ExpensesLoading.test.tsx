import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AppLoadingSkeleton, ExpenseLoadingState } from './ExpensesLoading';

describe('ExpensesLoading', () => {
  it('renders the app loading skeleton with skeleton placeholders', () => {
    const { container } = render(<AppLoadingSkeleton />);

    expect(container.querySelectorAll('[data-slot="skeleton"], .animate-pulse').length).toBeGreaterThan(5);
  });

  it('renders the expense loading state with five card skeletons', () => {
    const { container } = render(<ExpenseLoadingState />);

    const cards = container.querySelectorAll('.rounded-2xl.border');
    expect(cards.length).toBeGreaterThanOrEqual(5);
  });
});
