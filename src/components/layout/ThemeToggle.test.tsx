import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';

const setTheme = vi.fn();
const setAccent = vi.fn();
let currentTheme = 'dark';

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: currentTheme, setTheme }),
}));

vi.mock('@/hooks/useAccentColor', () => ({
  ACCENT_COLORS: [
    { key: 'violet', values: { swatch: '#8b5cf6' } },
    { key: 'blue', values: { swatch: '#3b82f6' } },
  ],
  useAccentColor: () => ({ accent: 'violet', setAccent }),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import ThemeToggle from './ThemeToggle';

describe('ThemeToggle', () => {
  it('lists all three themes', () => {
    currentTheme = 'dark';
    render(<ThemeToggle />);

    expect(screen.getByText('theme.light')).toBeInTheDocument();
    expect(screen.getByText('theme.dark')).toBeInTheDocument();
    expect(screen.getByText('theme.barbie')).toBeInTheDocument();
  });

  it('switches theme when an option is clicked', () => {
    currentTheme = 'dark';
    render(<ThemeToggle />);

    fireEvent.click(screen.getByText('theme.light'));
    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('shows accent picker when not in barbie theme', () => {
    currentTheme = 'dark';
    render(<ThemeToggle />);

    expect(screen.getByText('accent.pickColor')).toBeInTheDocument();
    expect(screen.getByLabelText('accent.colors.violet')).toBeInTheDocument();
  });

  it('hides accent picker in barbie theme', () => {
    currentTheme = 'barbie';
    render(<ThemeToggle />);

    expect(screen.queryByText('accent.pickColor')).not.toBeInTheDocument();
  });

  it('marks the currently selected accent with aria-pressed', () => {
    currentTheme = 'dark';
    render(<ThemeToggle />);

    expect(screen.getByLabelText('accent.colors.violet')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('accent.colors.blue')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('changes accent when a swatch is clicked', () => {
    currentTheme = 'dark';
    render(<ThemeToggle />);

    fireEvent.click(screen.getByLabelText('accent.colors.blue'));
    expect(setAccent).toHaveBeenCalledWith('blue');
  });
});
