import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div role="menu">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" role="menuitem" onClick={onClick}>
      {children}
    </button>
  ),
}));

import AppMenu from './AppMenu';

const renderMenu = () =>
  render(
    <MemoryRouter>
      <AppMenu />
    </MemoryRouter>,
  );

describe('layout/AppMenu', () => {
  it('renders the trigger with an accessible label', () => {
    renderMenu();

    expect(
      screen.getByRole('button', { name: 'navigation.openAppMenu' }),
    ).toBeInTheDocument();
  });

  it('shows a Recurring entry inside the menu', () => {
    renderMenu();

    expect(
      screen.getByRole('menuitem', { name: /navigation\.recurring/ }),
    ).toBeInTheDocument();
  });

  it('navigates to /recurring when the Recurring entry is clicked', () => {
    renderMenu();

    fireEvent.click(
      screen.getByRole('menuitem', { name: /navigation\.recurring/ }),
    );

    expect(mockNavigate).toHaveBeenCalledWith('/recurring');
  });
});
