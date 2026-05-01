import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';

let session: Session | null = null;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ session }),
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }),
}));

import Header from './Header';

const renderHeader = () =>
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );

describe('layout/Header', () => {
  it('returns null when there is no session', () => {
    session = null;
    const { container } = renderHeader();

    expect(container.firstChild).toBeNull();
  });

  it('renders branding when authenticated', () => {
    session = { user: { id: 'u1', email: 'jane@example.com' } } as Session;
    renderHeader();

    expect(screen.getByText('Budgard')).toBeInTheDocument();
  });

  it('shows the logo with the localized alt text', () => {
    session = { user: { id: 'u1', email: 'jane@example.com' } } as Session;
    renderHeader();

    const logo = screen.getByAltText('common.logoAlt');
    expect(logo).toHaveAttribute('src', '/icon-512x512.png');
  });

  it('renders both profile and app menu triggers', () => {
    session = { user: { id: 'u1', email: 'jane@example.com' } } as Session;
    renderHeader();

    expect(
      screen.getByRole('button', { name: 'navigation.openProfileMenu' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'navigation.openAppMenu' }),
    ).toBeInTheDocument();
  });
});
