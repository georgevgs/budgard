import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NavTabs from '@/components/layout/NavTabs';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <NavTabs />
    </MemoryRouter>,
  );

const indicatorAt = (path: string) =>
  renderAt(path).container.querySelector('.nav-indicator');

describe('NavTabs', () => {
  it('renders four tabs with localized labels', () => {
    renderAt('/today');

    expect(screen.getByText('navigation.today')).toBeInTheDocument();
    expect(screen.getByText('navigation.activity')).toBeInTheDocument();
    expect(screen.getByText('navigation.plan')).toBeInTheDocument();
    expect(screen.getByText('navigation.trends')).toBeInTheDocument();
  });

  it('wraps translated labels instead of cutting them off', () => {
    renderAt('/today');
    const activity = screen.getByText('navigation.activity');

    expect(activity).toHaveClass('whitespace-normal');
    expect(activity).not.toHaveClass('truncate');
  });

  it('points each tab to the right route', () => {
    renderAt('/today');
    const links = screen.getAllByRole('link');

    expect(links[0]).toHaveAttribute('href', '/today');
    expect(links[1]).toHaveAttribute('href', '/activity');
    expect(links[2]).toHaveAttribute('href', '/plan');
    expect(links[3]).toHaveAttribute('href', '/trends');
  });

  it('marks the current tab active via NavLink', () => {
    renderAt('/trends');
    const links = screen.getAllByRole('link');

    expect(links[3].className).toContain('active');
  });

  it('does not include Goals or Settings tabs (moved to header menus)', () => {
    renderAt('/today');

    expect(screen.queryByText('navigation.goals')).not.toBeInTheDocument();
    expect(screen.queryByText('navigation.settings')).not.toBeInTheDocument();
  });

  it('exposes an aria-label on the nav landmark', () => {
    renderAt('/expenses');
    expect(screen.getByLabelText('navigation.ariaLabel')).toBeInTheDocument();
  });

  it('slides the indicator to the slot matching the route', () => {
    expect(indicatorAt('/today')).toHaveStyle({
      transform: 'translateX(0%)',
    });
    expect(indicatorAt('/trends')).toHaveStyle({
      transform: 'translateX(300%)',
    });
  });

  it('keeps the indicator on the tab when a nested route is open', () => {
    expect(indicatorAt('/activity/42')).toHaveStyle({
      transform: 'translateX(100%)',
    });
  });

  it('keeps the indicator on Plan for the screens Plan links out to', () => {
    expect(indicatorAt('/networth')).toHaveStyle({
      transform: 'translateX(200%)',
    });
    expect(indicatorAt('/recurring')).toHaveStyle({
      transform: 'translateX(200%)',
    });
    expect(indicatorAt('/goals')).toHaveStyle({
      transform: 'translateX(200%)',
    });
    expect(indicatorAt('/debts')).toHaveStyle({
      transform: 'translateX(200%)',
    });
  });

  it('hides the indicator on routes that own no tab', () => {
    expect(indicatorAt('/settings')).toBeNull();
  });

  it('hides the indicator on a route that merely prefixes a tab path', () => {
    expect(indicatorAt('/activities')).toBeNull();
  });
});
