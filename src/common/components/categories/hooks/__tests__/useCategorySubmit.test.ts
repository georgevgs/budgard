import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCategorySubmit } from '@/common/components/categories/hooks/useCategorySubmit';
import type { Category } from '@/types/Category';

const mocks = vi.hoisted(() => ({ add: vi.fn(), update: vi.fn() }));

const GROCERIES = {
  id: 'groceries',
  name: 'Groceries',
  type: 'expense',
} as Category;
const SALARY = { id: 'salary', name: 'Salary', type: 'income' } as Category;

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } } }),
}));

vi.mock('@/common/contexts/DataContext', () => ({
  useCategoriesData: () => ({ categories: [GROCERIES, SALARY] }),
  useDataConfig: () => ({ isInitialized: true }),
}));

vi.mock('@/common/hooks/dataOps/useCategoryOps', () => ({
  useCategoryOps: () => ({
    handleCategoryAdd: mocks.add,
    handleCategoryUpdate: mocks.update,
  }),
}));

const VALUES = { name: 'Salary', color: '#000000' };

const renderSubmit = (category?: Category) => {
  const onNameTaken = vi.fn();
  const onClose = vi.fn();
  const { result } = renderHook(() =>
    useCategorySubmit({
      category,
      isIncomeCategory: false,
      onClose,
      onNameTaken,
    }),
  );

  return { result, onNameTaken, onClose };
};

describe('useCategorySubmit', () => {
  beforeEach(() => {
    mocks.add.mockReset();
    mocks.update.mockReset();
  });

  // categories_user_id_name_key spans both types, so an expense named after
  // an income source was refused by the database with a generic toast.
  it('marks the name instead of sending one the database refuses', async () => {
    const { result, onNameTaken, onClose } = renderSubmit();

    await act(async () => {
      await result.current.handleSubmit(VALUES);
    });

    expect(onNameTaken).toHaveBeenCalledOnce();
    expect(mocks.add).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('lets an edit keep its own name', async () => {
    mocks.update.mockResolvedValue(GROCERIES);
    const { result, onNameTaken, onClose } = renderSubmit(GROCERIES);

    await act(async () => {
      await result.current.handleSubmit({ ...VALUES, name: 'Groceries' });
    });

    expect(onNameTaken).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('marks the name when the server reports a duplicate the list missed', async () => {
    mocks.add.mockRejectedValue({ code: '23505', message: 'duplicate key' });
    const { result, onNameTaken, onClose } = renderSubmit();

    await act(async () => {
      await result.current.handleSubmit({ ...VALUES, name: 'Rent' });
    });

    expect(onNameTaken).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });
});
