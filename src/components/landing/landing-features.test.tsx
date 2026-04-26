import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

vi.mock('@/components/landing/Reveal', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/landing/SectionShell', () => ({
  default: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}));

vi.mock('@/components/landing/DeviceFrame', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import Categories from './Categories';
import Budget from './Budget';
import Analytics from './Analytics';

describe('Categories', () => {
  it('renders the heading and body', () => {
    render(<Categories />);

    expect(
      screen.getByRole('heading', { name: 'landing.categories.heading' }),
    ).toBeInTheDocument();
    expect(screen.getByText('landing.categories.body')).toBeInTheDocument();
  });

  it('renders nine category tiles', () => {
    render(<Categories />);

    const tiles = [
      'housing', 'food', 'transport', 'subs', 'health',
      'fun', 'travel', 'gifts', 'pets',
    ];
    tiles.forEach((key) =>
      expect(
        screen.getByText(`landing.categories.tile.${key}`),
      ).toBeInTheDocument(),
    );
  });

  it('renders three bullet points', () => {
    render(<Categories />);

    expect(screen.getByText('landing.categories.point1')).toBeInTheDocument();
    expect(screen.getByText('landing.categories.point2')).toBeInTheDocument();
    expect(screen.getByText('landing.categories.point3')).toBeInTheDocument();
  });
});

describe('Budget', () => {
  it('renders the budget card with progress', () => {
    render(<Budget />);

    expect(screen.getByText('€1,058')).toBeInTheDocument();
    expect(screen.getByText('/ €2,000')).toBeInTheDocument();
    expect(screen.getByText('53%')).toBeInTheDocument();
  });

  it('renders the four category rows', () => {
    render(<Budget />);

    expect(screen.getByText('landing.budget.cats.housing')).toBeInTheDocument();
    expect(screen.getByText('landing.budget.cats.food')).toBeInTheDocument();
    expect(screen.getByText('landing.budget.cats.transport')).toBeInTheDocument();
    expect(screen.getByText('landing.budget.cats.subs')).toBeInTheDocument();
  });

  it('renders the body copy', () => {
    render(<Budget />);

    expect(screen.getByText('landing.budget.body')).toBeInTheDocument();
  });
});

describe('Analytics', () => {
  it('renders the heading and copy', () => {
    render(<Analytics />);

    expect(
      screen.getByRole('heading', { name: 'landing.analytics.heading' }),
    ).toBeInTheDocument();
  });

  it('renders the chart card with hard-coded total', () => {
    render(<Analytics />);

    expect(screen.getByText('€8,868')).toBeInTheDocument();
  });

  it('renders the SVG chart with a polyline and polygon', () => {
    const { container } = render(<Analytics />);

    expect(container.querySelector('svg polyline')).not.toBeNull();
    expect(container.querySelector('svg polygon')).not.toBeNull();
  });
});
