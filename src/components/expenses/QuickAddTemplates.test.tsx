import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import QuickAddTemplates from '@/components/expenses/QuickAddTemplates';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';

const { template } = vi.hoisted(() => {
  const value: ExpenseTemplate = {
    id: 'template-1',
    user_id: 'user-1',
    amount: 4.5,
    description: 'Flat white',
    category_id: null,
    tag_id: null,
    original_currency: 'EUR',
    created_at: '2026-08-01T00:00:00.000Z',
  };

  return { template: value };
});

vi.mock('@/contexts/DataContext', () => ({
  useTemplatesData: () => [template],
  useDataConfig: () => ({ defaultCurrency: 'EUR' }),
}));

vi.mock('@/hooks/dataOps/useTemplateOps', () => ({
  useTemplateOps: () => ({ handleTemplateDelete: vi.fn() }),
}));

describe('QuickAddTemplates', () => {
  it('uses the template and closes the add flow', () => {
    const onUse = vi.fn();
    const onClose = vi.fn();
    render(<QuickAddTemplates onUse={onUse} onClose={onClose} />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'templates.useTemplate',
      }),
    );

    expect(onUse).toHaveBeenCalledWith(template);
    expect(onClose).toHaveBeenCalled();
  });
});
