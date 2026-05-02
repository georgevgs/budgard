import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagClearButton, TagButtonContent } from './TagPicker';

describe('TagClearButton', () => {
  it('renders a span, not a button, to avoid nested button issues', () => {
    const { container } = render(<TagClearButton onClear={vi.fn()} />);

    const clearElement = container.querySelector(
      '[aria-label="expenses.clearTag"]',
    );
    expect(clearElement).not.toBeNull();
    expect(clearElement!.tagName).toBe('SPAN');
    expect(clearElement!.getAttribute('role')).toBe('button');
    expect(clearElement!.getAttribute('tabindex')).toBe('0');
  });

  it('calls onClear when clicked', () => {
    const onClear = vi.fn();
    render(<TagClearButton onClear={onClear} />);

    fireEvent.click(screen.getByLabelText('expenses.clearTag'));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('calls onClear on Enter key', () => {
    const onClear = vi.fn();
    render(<TagClearButton onClear={onClear} />);

    fireEvent.keyDown(screen.getByLabelText('expenses.clearTag'), {
      key: 'Enter',
    });
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('calls onClear on Space key', () => {
    const onClear = vi.fn();
    render(<TagClearButton onClear={onClear} />);

    fireEvent.keyDown(screen.getByLabelText('expenses.clearTag'), { key: ' ' });
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('does not call onClear on other keys', () => {
    const onClear = vi.fn();
    render(<TagClearButton onClear={onClear} />);

    fireEvent.keyDown(screen.getByLabelText('expenses.clearTag'), {
      key: 'Tab',
    });
    expect(onClear).not.toHaveBeenCalled();
  });
});

describe('TagButtonContent', () => {
  it('renders placeholder when no tag selected', () => {
    render(<TagButtonContent selectedTag={undefined} />);
    expect(screen.getByText('expenses.noTag')).toBeInTheDocument();
  });

  it('renders tag name and color dot when tag is selected', () => {
    const tag = { name: 'Groceries', color: '#22c55e' };
    render(<TagButtonContent selectedTag={tag} />);

    expect(screen.getByText('Groceries')).toBeInTheDocument();
    const dot = document.querySelector('[style*="background-color"]');
    expect(dot).not.toBeNull();
    expect((dot as HTMLElement).style.backgroundColor).toBe(
      'rgb(34, 197, 94)',
    );
  });
});
