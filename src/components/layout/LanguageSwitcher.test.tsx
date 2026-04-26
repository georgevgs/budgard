import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import LanguageSwitcher from './LanguageSwitcher';

const changeLanguage = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage },
  }),
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
}));

describe('LanguageSwitcher', () => {
  it('renders a trigger with an accessible label', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText('common.switchLanguage')).toBeInTheDocument();
  });

  it('renders both languages', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Ελληνικά')).toBeInTheDocument();
  });

  it('changes language when an item is clicked', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByText('Ελληνικά'));
    expect(changeLanguage).toHaveBeenCalledWith('el');
  });

  it('marks the currently selected language with the accent class', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText('English').className).toContain('bg-accent');
  });
});
