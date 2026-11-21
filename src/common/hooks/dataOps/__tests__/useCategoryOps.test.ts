import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Category } from '@/types/Category';

vi.mock('@/common/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/common/contexts/FinancialSpaceContext', () => ({
  useFinancialSpace: () => ({ activeOwnerId: 'u1' }),
}));

vi.mock('@/common/hooks/dataOps/useShowErrorToast', () => ({
  useShowErrorToast: () => vi.fn(),
}));

vi.mock('@/constants/haptics', () => ({
  haptics: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    selection: vi.fn(),
  },
}));

vi.mock('@/config/sentry', () => ({ captureException: vi.fn() }));

const svc = vi.hoisted(() => ({ createCategories: vi.fn() }));
vi.mock('@/common/api/dataService', () => ({ dataService: svc }));

const store = vi.hoisted(() => ({ categories: [] as unknown[] }));
const mockSetCategories = vi.hoisted(() =>
  vi.fn((arg: unknown) => {
    if ('function' === typeof arg) {
      store.categories = (arg as (previous: unknown[]) => unknown[])(
        store.categories,
      );
    } else {
      store.categories = arg as unknown[];
    }
  }),
);
vi.mock('@/common/contexts/DataContext', () => ({
  useDataConfig: () => ({ isInitialized: true }),
  useDataActions: () => ({ setCategories: mockSetCategories }),
}));

import { useCategoryOps } from '@/common/hooks/dataOps/useCategoryOps';

const category = (over: Partial<Category>): Category =>
  ({ id: 'c1', name: 'Food', ...over }) as Category;

beforeEach(() => {
  vi.clearAllMocks();
  store.categories = [];
});

describe('useCategoryOps bulk create', () => {
  it('adds only the rows the list does not have yet, sorted by name', async () => {
    store.categories = [category({ id: 'c1', name: 'Food' })];
    svc.createCategories.mockResolvedValue([
      category({ id: 'c1', name: 'Food' }),
      category({ id: 'c2', name: 'Bills' }),
    ]);

    const { result } = renderHook(() => useCategoryOps());
    await act(async () => {
      await result.current.handleCategoriesAddBulk([
        { name: 'Food' },
        { name: 'Bills' },
      ]);
    });

    expect(svc.createCategories).toHaveBeenCalledWith(
      [{ name: 'Food' }, { name: 'Bills' }],
      'u1',
    );
    expect((store.categories as Category[]).map((item) => item.id)).toEqual([
      'c2',
      'c1',
    ]);
  });
});
