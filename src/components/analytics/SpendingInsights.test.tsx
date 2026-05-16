import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Insight } from '@/hooks/useSpendingInsights';

let mockInsights: Insight[] = [];

vi.mock('@/hooks/useSpendingInsights', () => ({
  useSpendingInsights: () => mockInsights,
}));

import SpendingInsights from './SpendingInsights';

const Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg data-testid="insight-icon" {...props} />
);

const baseProps = {
  expenses: [],
  monthlyBudget: null,
  monthComparison: { thisMonthAmount: 0, lastMonthAmount: 0 },
  categories: [],
  defaultCurrency: 'EUR',
};

const insight = (id: string, variant: Insight['variant'], text = id): Insight => ({
  id,
  variant,
  text,
  icon: Icon as unknown as Insight['icon'],
});

describe('SpendingInsights', () => {
  it('returns null when there are no insights', () => {
    mockInsights = [];
    const { container } = render(<SpendingInsights {...baseProps} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders only the hero when there is a single insight', () => {
    mockInsights = [insight('a', 'default', 'Hero text')];
    const { container } = render(<SpendingInsights {...baseProps} />);

    expect(screen.getByText('Hero text')).toBeInTheDocument();
    expect(container.querySelectorAll('.rounded-2xl')).toHaveLength(1);
  });

  it('renders hero plus secondary cards for multiple insights', () => {
    mockInsights = [
      insight('a', 'warning', 'Hero'),
      insight('b', 'positive', 'Second'),
      insight('c', 'default', 'Third'),
    ];
    render(<SpendingInsights {...baseProps} />);

    expect(screen.getByText('Hero')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });

  it('applies amber background when hero variant is warning', () => {
    mockInsights = [insight('a', 'warning', 'Hero')];
    const { container } = render(<SpendingInsights {...baseProps} />);

    const hero = container.querySelector('.rounded-2xl');
    expect(hero?.className).toContain('amber');
  });

  it('applies income background when hero variant is positive', () => {
    mockInsights = [insight('a', 'positive', 'Hero')];
    const { container } = render(<SpendingInsights {...baseProps} />);

    const hero = container.querySelector('.rounded-2xl');
    expect(hero?.className).toContain('income');
  });

  it('applies primary background when hero variant is default', () => {
    mockInsights = [insight('a', 'default', 'Hero')];
    const { container } = render(<SpendingInsights {...baseProps} />);

    const hero = container.querySelector('.rounded-2xl');
    expect(hero?.className).toContain('primary');
  });
});
