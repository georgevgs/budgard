import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CategoryBadge from './CategoryBadge';
import type { Category } from '@/types/Category';

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat-1',
  name: 'Groceries',
  color: '#22c55e',
  icon: null,
  user_id: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('CategoryBadge', () => {
  it('renders the category name', () => {
    render(<CategoryBadge category={makeCategory()} />);

    expect(screen.getByText('Groceries')).toBeInTheDocument();
  });

  it('applies tinted background and solid foreground from color', () => {
    const { container } = render(
      <CategoryBadge category={makeCategory({ color: '#22c55e' })} />,
    );
    const badge = container.firstChild as HTMLElement;

    expect(badge.style.color).toBe('rgb(34, 197, 94)');
    expect(badge.style.backgroundColor).toContain('rgba(34, 197, 94');
  });

  it('merges custom className with base classes', () => {
    const { container } = render(
      <CategoryBadge category={makeCategory()} className="custom-extra" />,
    );
    const badge = container.firstChild as HTMLElement;

    expect(badge.className).toContain('custom-extra');
    expect(badge.className).toContain('rounded-full');
  });
});
