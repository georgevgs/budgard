import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';

let session: Session | null = null;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ session }),
}));

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
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

import ProfileMenu from './ProfileMenu';

const renderMenu = () =>
  render(
    <MemoryRouter>
      <ProfileMenu />
    </MemoryRouter>,
  );

describe('layout/ProfileMenu', () => {
  it('renders nothing when not signed in', () => {
    session = null;
    const { container } = renderMenu();

    expect(container.firstChild).toBeNull();
  });

  it('uses the first letter of the email as the avatar initial', () => {
    session = { user: { id: 'u1', email: 'Jane@example.com' } } as Session;
    renderMenu();

    const trigger = screen.getByRole('button', {
      name: 'navigation.openProfileMenu',
    });
    expect(trigger).toHaveTextContent('J');
  });

  it('falls back to "?" when there is no email', () => {
    session = { user: { id: 'u1' } } as Session;
    renderMenu();

    const trigger = screen.getByRole('button', {
      name: 'navigation.openProfileMenu',
    });
    expect(trigger).toHaveTextContent('?');
  });

  it('shows the email and "Signed in as" label', () => {
    session = { user: { id: 'u1', email: 'jane@example.com' } } as Session;
    renderMenu();

    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('navigation.signedInAs')).toBeInTheDocument();
  });

  it('navigates to /settings when the Settings entry is clicked', () => {
    session = { user: { id: 'u1', email: 'jane@example.com' } } as Session;
    renderMenu();

    fireEvent.click(
      screen.getByRole('menuitem', { name: /navigation\.settings/ }),
    );

    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });
});
