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
    expect(container.querySelectorAll('[data-insight]')).toHaveLength(1);
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

  // The variant used to tint the whole hero card — `bg-income/10` and a
  // matching border — which is a mint-green wash across the widest card on the
  // screen, and a hue mixed into a white surface is the one thing the palette
  // rules out by name. It now rides the icon's ink instead.
  it.each([
    ['warning', 'text-warning-ink'],
    ['positive', 'text-income-ink'],
    ['default', 'text-primary-ink'],
  ] as const)('carries the %s variant on the icon, in ink', (variant, ink) => {
    mockInsights = [insight('a', variant, 'Hero')];
    const { container } = render(<SpendingInsights {...baseProps} />);

    expect(container.querySelector(`.${ink}`)).not.toBeNull();
  });

  it.each(['warning', 'positive', 'default'] as const)(
    'never washes the %s hero in a hue',
    (variant) => {
      mockInsights = [insight('a', variant, 'Hero')];
      const { container } = render(<SpendingInsights {...baseProps} />);

      const hero = container.querySelector('[data-insight="hero"]');

      expect(hero).toHaveClass('surface-card');
      expect(hero?.className).not.toMatch(/bg-(primary|income|warning)/);
    },
  );
});
