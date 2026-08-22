import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ExpenseFormActions from '@/components/expenses/ExpenseFormActions';

describe('ExpenseFormActions', () => {
  it('keeps the validation hint separate from the paired action buttons', () => {
    render(
      <form>
        <ExpenseFormActions
          isValid={false}
          isSubmitting={false}
          onClose={vi.fn()}
        />
      </form>,
    );

    const hint = screen.getByText('expenses.saveHint');
    const cancel = screen.getByRole('button', { name: 'common.cancel' });
    const save = screen.getByRole('button', { name: 'expenses.saveExpense' });
    const actions = cancel.parentElement;

    expect(hint.parentElement).not.toBe(actions);
    expect(save.parentElement).toBe(actions);
    expect(actions).toHaveClass('flex-nowrap');
    expect(within(actions as HTMLElement).getAllByRole('button')).toHaveLength(
      2,
    );
  });

  it('keeps cancel available and enables save when the form is valid', () => {
    const onClose = vi.fn();
    render(
      <form>
        <ExpenseFormActions isValid isSubmitting={false} onClose={onClose} />
      </form>,
    );

    expect(screen.queryByText('expenses.saveHint')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'expenses.saveExpense' }),
    ).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
