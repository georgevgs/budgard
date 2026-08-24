import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Insight } from '@/hooks/useSpendingInsights';

let mockInsights: Insight[] = [];

vi.mock('@/hooks/useSpendingInsights', () => ({
  useSpendingInsights: () => mockInsights,
}));

import SpendingInsights from '@/components/analytics/SpendingInsights';

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

const insight = (
  id: string,
  variant: Insight['variant'],
  text = id,
): Insight => ({
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

  it('renders one grouped row when there is a single insight', () => {
    mockInsights = [insight('a', 'default', 'First insight')];
    const { container } = render(<SpendingInsights {...baseProps} />);

    expect(screen.getByText('First insight')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-insight]')).toHaveLength(1);
    expect(container.querySelector('[data-insight-list]')).toHaveClass(
      'surface-card',
    );
  });

  it('renders multiple insights as rows in one surface', () => {
    mockInsights = [
      insight('a', 'warning', 'First'),
      insight('b', 'positive', 'Second'),
      insight('c', 'default', 'Third'),
    ];
    render(<SpendingInsights {...baseProps} />);

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-insight-list]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-insight]')).toHaveLength(3);
  });

  it('uses the same foreground ink and weight for every insight', () => {
    mockInsights = [
      insight('a', 'warning', 'First'),
      insight('b', 'positive', 'Second'),
    ];
    render(<SpendingInsights {...baseProps} />);

    expect(screen.getByText('First')).toHaveClass('text-foreground');
    expect(screen.getByText('First')).not.toHaveClass('font-medium');
    expect(screen.getByText('Second')).toHaveClass('text-foreground');
    for (const icon of screen.getAllByTestId('insight-icon')) {
      expect(icon).toHaveClass('text-foreground');
    }
  });

  it.each(['warning', 'positive', 'default'] as const)(
    'never washes the %s insight list in a hue',
    (variant) => {
      mockInsights = [insight('a', variant, 'First')];
      const { container } = render(<SpendingInsights {...baseProps} />);

      const list = container.querySelector('[data-insight-list]');

      expect(list).toHaveClass('surface-card');
      expect(list?.className).not.toMatch(/bg-(primary|income|warning)/);
    },
  );
});
