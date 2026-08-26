import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TransactionNote from '@/components/transaction/TransactionNote';

describe('transaction/TransactionNote', () => {
  it('keeps an empty note compact until requested', () => {
    render(
      <TransactionNote
        value=""
        isDirty={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'transaction.note.add' }),
    );

    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('shows an existing note as a compact editable summary', () => {
    render(
      <TransactionNote
        value="Dinner with Alex"
        isDirty={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText('Dinner with Alex')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('saves when the editor loses focus', () => {
    const onSave = vi.fn();
    render(
      <TransactionNote value="" isDirty onChange={vi.fn()} onSave={onSave} />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'transaction.note.add' }),
    );
    fireEvent.blur(screen.getByRole('textbox'));

    expect(onSave).toHaveBeenCalledOnce();
  });
});
