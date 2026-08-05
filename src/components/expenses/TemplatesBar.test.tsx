import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TemplatesBar from '@/components/expenses/TemplatesBar';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';

vi.mock('@/components/expenses/TemplateDeleteDialog', () => ({
  default: () => null,
}));

const template: ExpenseTemplate = {
  id: 'template-1',
  user_id: 'user-1',
  amount: 24,
  description: 'Lunch',
  category_id: null,
  tag_id: null,
  original_currency: 'EUR',
  created_at: '2026-08-05T00:00:00.000Z',
};

describe('TemplatesBar', () => {
  it('keeps delete and use actions as sibling controls in manage mode', () => {
    render(
      <TemplatesBar
        templates={[template]}
        defaultCurrency="EUR"
        onUse={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'templates.manage' }));

    const useButton = screen.getByRole('button', {
      name: 'templates.useTemplate',
    });
    const deleteButton = screen.getByRole('button', {
      name: 'expenses.deleteTemplate',
    });

    expect(useButton).toBeDisabled();
    expect(useButton.contains(deleteButton)).toBe(false);
  });
});
