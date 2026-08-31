// Regression coverage for a real bug: deleteImpact used to be a useMemo over
// the live expenses/incomes arrays. A merge reassigns the affected rows'
// category_id as its very first (optimistic) step, so the live count dropped
// to zero mid-confirm — flipping which delete dialog was "open" right under
// the user and flashing the plain confirm dialog before the mutation even
// finished. The fix snapshots the impact once, when delete is requested.
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCategoryManager } from '@/hooks/categories/useCategoryManager';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';

const category = { id: 'c1', name: 'Dining' } as Category;
const other = { id: 'c2', name: 'Food' } as Category;

const expense = (overrides: Partial<Expense>): Expense =>
  ({
    id: 'x',
    amount: 10,
    description: 'x',
    date: '2026-01-01',
    user_id: 'u',
    created_at: '2026-01-01',
    category_id: 'c1',
    ...overrides,
  }) as Expense;

let expensesData: Expense[] = [];

vi.mock('@/contexts/DataContext', () => ({
  useCategoriesData: () => ({
    expenseCategories: [category, other],
    incomeCategories: [],
  }),
  useExpensesData: () => expensesData,
  useIncomesData: () => [],
}));

const mockMerge = vi.fn();
const mockDelete = vi.fn();
vi.mock('@/hooks/dataOps/useCategoryOps', () => ({
  useCategoryOps: () => ({
    handleCategoryDelete: mockDelete,
    handleCategoryMerge: mockMerge,
  }),
}));

vi.mock('@/hooks/pro/useProGate', () => ({
  useProGate: () => ({ allow: () => true }),
}));

describe('useCategoryManager', () => {
  it('freezes the impact count at request time instead of tracking it live', () => {
    expensesData = [expense({ id: 'e1' }), expense({ id: 'e2' })];

    const { result, rerender } = renderHook(() => useCategoryManager('expense'));

    act(() => {
      result.current.requestDelete(category);
    });

    expect(result.current.deleteImpact?.count).toBe(2);

    // Simulate the merge's optimistic step already having reassigned both
    // rows away from the category being deleted, the way it really does
    // before the network call resolves.
    expensesData = expensesData.map((e) => ({ ...e, category_id: 'c2' }));
    rerender();

    expect(result.current.deleteImpact?.count).toBe(2);
    expect(result.current.deleteTarget?.id).toBe('c1');
  });

  it('resets the snapshot to a fresh count for the next category', () => {
    expensesData = [expense({ id: 'e1' })];

    const { result } = renderHook(() => useCategoryManager('expense'));

    act(() => {
      result.current.requestDelete(category);
    });
    expect(result.current.deleteImpact?.count).toBe(1);

    act(() => {
      result.current.cancelDelete();
    });
    expect(result.current.deleteTarget).toBeNull();

    act(() => {
      result.current.requestDelete(other);
    });
    expect(result.current.deleteImpact?.count).toBe(0);
  });
});
