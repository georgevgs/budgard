import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useIncomeCategoryPicker } from '@/pages/income/hooks/useIncomeCategoryPicker';
import type { IncomeFormData } from '@/pages/income/validations';
import type { Category } from '@/types/Category';

const mocks = vi.hoisted(() => ({ add: vi.fn(), allow: vi.fn() }));

const OTHER = { id: 'other', name: 'Other', type: 'expense' } as Category;
const SALARY = { id: 'salary', name: 'Salary', type: 'income' } as Category;

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } } }),
}));

vi.mock('@/common/contexts/DataContext', () => ({
  useCategoriesData: () => ({
    categories: [OTHER, SALARY],
    incomeCategories: [SALARY],
  }),
}));

vi.mock('@/common/hooks/dataOps/useCategoryOps', () => ({
  useCategoryOps: () => ({ handleCategoryAdd: mocks.add }),
}));

vi.mock('@/common/hooks/useProGate', () => ({
  useProGate: () => ({ allow: mocks.allow }),
}));

const renderPicker = () =>
  renderHook(() => {
    const form = useForm<IncomeFormData>();

    return { picker: useIncomeCategoryPicker(form), form };
  });

describe('useIncomeCategoryPicker', () => {
  beforeEach(() => {
    mocks.add.mockReset();
    mocks.add.mockResolvedValue(undefined);
    mocks.allow.mockReset();
    mocks.allow.mockReturnValue(true);
  });

  it('does not offer a source whose name an expense category already holds', () => {
    const { result } = renderPicker();

    act(() => {
      result.current.picker.setCategorySearch('other');
    });

    expect(result.current.picker.shouldShowCreateOption).toBe(false);
  });

  it('selects the existing source instead of creating a duplicate', () => {
    const { result } = renderPicker();

    act(() => {
      result.current.picker.setCategorySearch('Salary ');
    });
    act(() => {
      result.current.picker.handleCategoryCreateInline();
    });

    expect(mocks.add).not.toHaveBeenCalled();
    expect(result.current.form.getValues('category_id')).toBe('salary');
  });

  it('asks the free-plan gate before creating a source', () => {
    mocks.allow.mockReturnValue(false);
    const { result } = renderPicker();

    act(() => {
      result.current.picker.setCategorySearch('Freelance');
    });
    act(() => {
      result.current.picker.handleCategoryCreateInline();
    });

    expect(mocks.allow).toHaveBeenCalledWith(
      'categories',
      1,
      expect.any(Object),
    );
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it('creates a genuinely new source once the gate allows it', async () => {
    const { result } = renderPicker();

    act(() => {
      result.current.picker.setCategorySearch('Freelance ');
    });
    await act(async () => {
      result.current.picker.handleCategoryCreateInline();
    });

    expect(mocks.add).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Freelance', type: 'income' }),
    );
  });
});
