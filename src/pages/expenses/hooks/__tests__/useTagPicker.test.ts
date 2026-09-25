import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTagPicker } from '@/pages/expenses/hooks/useTagPicker';
import type { ExpenseFormData } from '@/pages/expenses/validations';
import type { Tag } from '@/types/Tag';

const mocks = vi.hoisted(() => ({ create: vi.fn() }));

const FOOD = { id: 'tag-food', name: 'Food', color: '#000000' } as Tag;

vi.mock('@/common/contexts/DataContext', () => ({
  useTagsData: () => [FOOD],
}));

vi.mock('@/common/hooks/dataOps/useTagOps', () => ({
  useTagOps: () => ({ handleTagCreate: mocks.create }),
}));

vi.mock('@/common/hooks/useProGate', () => ({
  useProGate: () => ({ allow: () => true }),
}));

const renderPicker = () =>
  renderHook(() => {
    const form = useForm<ExpenseFormData>();

    return { picker: useTagPicker(form), form };
  });

describe('useTagPicker', () => {
  beforeEach(() => {
    mocks.create.mockReset();
  });

  // iOS appends a space after a keyboard suggestion. The create trims it, so
  // offering "Create" here sent a name the database already had.
  it('does not offer to create a tag that exists apart from a trailing space', () => {
    const { result } = renderPicker();

    act(() => {
      result.current.picker.setTagSearch('food ');
    });

    expect(result.current.picker.shouldShowCreateOption).toBe(false);
  });

  it('selects the existing tag instead of creating a duplicate', () => {
    const { result } = renderPicker();

    act(() => {
      result.current.picker.setTagSearch('Food ');
    });
    act(() => {
      result.current.picker.handleTagCreateInline();
    });

    expect(mocks.create).not.toHaveBeenCalled();
    expect(result.current.form.getValues('tag_id')).toBe('tag-food');
  });

  it('still offers a genuinely new tag', () => {
    const { result } = renderPicker();

    act(() => {
      result.current.picker.setTagSearch('Travel ');
    });

    expect(result.current.picker.shouldShowCreateOption).toBe(true);
  });
});
