import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagChip } from '@/components/expenses/TagPicker';

const tag = { id: 'tag-1', name: 'Groceries', color: '#22c55e' };

describe('TagChip', () => {
  it('renders the tag name and color dot', () => {
    render(<TagChip tag={tag} onRemove={vi.fn()} />);

    expect(screen.getByText('Groceries')).toBeInTheDocument();
    const dot = document.querySelector('[style*="background-color"]');
    expect(dot).not.toBeNull();
    expect((dot as HTMLElement).style.backgroundColor).toBe(
      'rgb(34, 197, 94)',
    );
  });

  it('renders a real remove button (chips live outside the popover trigger)', () => {
    render(<TagChip tag={tag} onRemove={vi.fn()} />);

    const removeButton = screen.getByLabelText('expenses.removeTag');
    expect(removeButton.tagName).toBe('BUTTON');
    expect(removeButton.getAttribute('type')).toBe('button');
  });

  it('calls onRemove when the remove button is clicked', () => {
    const onRemove = vi.fn();
    render(<TagChip tag={tag} onRemove={onRemove} />);

    fireEvent.click(screen.getByLabelText('expenses.removeTag'));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('does not call onRemove when other parts of the chip are clicked', () => {
    const onRemove = vi.fn();
    render(<TagChip tag={tag} onRemove={onRemove} />);

    fireEvent.click(screen.getByText('Groceries'));
    expect(onRemove).not.toHaveBeenCalled();
  });
});
