import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AppMenu from '@/components/layout/AppMenu';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/useIsPro', () => ({
  useIsPro: () => true,
}));

vi.mock('@/contexts/UpgradeDialogContext', () => ({
  useUpgradeDialog: () => ({ openUpgrade: vi.fn() }),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div role="menu">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    ...props
  }: {
    children: ReactNode;
    onClick?: () => void;
    'aria-current'?: 'page';
    className?: string;
  }) => (
    <button type="button" role="menuitem" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

const renderMenu = (path: string) => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppMenu />
    </MemoryRouter>,
  );
};

describe('layout/AppMenu', () => {
  it('marks the current secondary route in the menu', () => {
    renderMenu('/networth');

    expect(
      screen.getByRole('menuitem', { name: 'navigation.networth' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getByRole('menuitem', { name: 'navigation.goals' }),
    ).not.toHaveAttribute('aria-current');
  });

  it('uses the same route transition when a menu destination is selected', () => {
    renderMenu('/expenses');

    fireEvent.click(screen.getByRole('menuitem', { name: 'navigation.debts' }));

    expect(mockNavigate).toHaveBeenCalledWith('/debts', {
      viewTransition: true,
    });
  });
});
