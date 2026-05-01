import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NavTabs from './NavTabs';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <NavTabs />
    </MemoryRouter>,
  );

describe('NavTabs', () => {
  it('renders four tabs with localized labels', () => {
    renderAt('/expenses');

    expect(screen.getByText('navigation.expenses')).toBeInTheDocument();
    expect(screen.getByText('navigation.income')).toBeInTheDocument();
    expect(screen.getByText('navigation.recurring')).toBeInTheDocument();
    expect(screen.getByText('navigation.analytics')).toBeInTheDocument();
  });

  it('points each tab to the right route', () => {
    renderAt('/expenses');
    const links = screen.getAllByRole('link');

    expect(links[0]).toHaveAttribute('href', '/expenses');
    expect(links[1]).toHaveAttribute('href', '/income');
    expect(links[2]).toHaveAttribute('href', '/recurring');
    expect(links[3]).toHaveAttribute('href', '/analytics');
  });

  it('marks the current tab active via NavLink', () => {
    renderAt('/analytics');
    const links = screen.getAllByRole('link');

    expect(links[3].className).toContain('active');
  });

  it('does not include Goals or Settings tabs (moved to header menus)', () => {
    renderAt('/expenses');

    expect(screen.queryByText('navigation.goals')).not.toBeInTheDocument();
    expect(screen.queryByText('navigation.settings')).not.toBeInTheDocument();
  });

  it('exposes an aria-label on the nav landmark', () => {
    renderAt('/expenses');
    expect(screen.getByLabelText('navigation.ariaLabel')).toBeInTheDocument();
  });
});
