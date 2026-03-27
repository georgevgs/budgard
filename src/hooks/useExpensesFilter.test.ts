import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExpensesFilter } from './useExpensesFilter';
import type { Expense } from '@/types/Expense';

const makeExpense = (
  overrides: Partial<Expense> & { id: string; date: string },
): Expense => ({
  amount: 10,
  description: 'Test',
  user_id: 'u1',
  created_at: overrides.date + 'T10:00:00Z',
  category_id: null,
  ...overrides,
});

const expenses: Expense[] = [
  makeExpense({
    id: '1',
    date: '2026-01-15',
    amount: 50,
    description: 'Groceries',
    category_id: 'cat-1',
    category: {
      id: 'cat-1',
      name: 'Food',
      color: '#F00',
      user_id: 'u1',
      created_at: '',
    },
  }),
  makeExpense({
    id: '2',
    date: '2026-01-10',
    amount: 20,
    description: 'Bus ticket',
    category_id: 'cat-2',
    category: {
      id: 'cat-2',
      name: 'Transport',
      color: '#0F0',
      user_id: 'u1',
      created_at: '',
    },
  }),
  makeExpense({
    id: '3',
    date: '2026-01-20',
    amount: 100,
    description: 'Dinner',
    category_id: 'cat-1',
    category: {
      id: 'cat-1',
      name: 'Food',
      color: '#F00',
      user_id: 'u1',
      created_at: '',
    },
  }),
  makeExpense({
    id: '4',
    date: '2026-02-05',
    amount: 30,
    description: 'Lunch',
    category_id: 'cat-1',
  }),
  makeExpense({
    id: '5',
    date: '2026-01-12',
    amount: 15,
    description: 'Coffee',
    tag_id: 'tag-1',
    tag: {
      id: 'tag-1',
      name: 'Daily',
      color: '#00F',
      user_id: 'u1',
      created_at: '',
    },
  }),
];

describe('useExpensesFilter', () => {
  const setup = (month = '2026-01') =>
    renderHook(() => useExpensesFilter({ expenses, selectedMonth: month }));

  it('filters expenses by selected month', () => {
    const { result } = setup();
    expect(result.current.monthlyExpenses).toHaveLength(4);
    // February expense should be excluded
    expect(
      result.current.monthlyExpenses.every((e) => e.date.startsWith('2026-01')),
    ).toBe(true);
  });

  it('sorts by date descending by default', () => {
    const { result } = setup();
    const dates = result.current.filteredExpenses.map((e) => e.date);
    expect(dates).toEqual([
      '2026-01-20',
      '2026-01-15',
      '2026-01-12',
      '2026-01-10',
    ]);
  });

  it('filters by search text in description', () => {
    const { result } = setup();

    act(() => {
      result.current.setSearch('coffee');
    });

    expect(result.current.filteredExpenses).toHaveLength(1);
    expect(result.current.filteredExpenses[0].description).toBe('Coffee');
  });

  it('filters by search text in category name', () => {
    const { result } = setup();

    act(() => {
      result.current.setSearch('food');
    });

    expect(
      result.current.filteredExpenses.every((e) => e.category?.name === 'Food'),
    ).toBe(true);
  });

  it('filters by category id', () => {
    const { result } = setup();

    act(() => {
      result.current.setSelectedCategoryId('cat-2');
    });

    expect(result.current.filteredExpenses).toHaveLength(1);
    expect(result.current.filteredExpenses[0].description).toBe('Bus ticket');
  });

  it('filters by tag id', () => {
    const { result } = setup();

    act(() => {
      result.current.setSelectedTagId('tag-1');
    });

    expect(result.current.filteredExpenses).toHaveLength(1);
    expect(result.current.filteredExpenses[0].description).toBe('Coffee');
  });

  it('sorts by amount descending', () => {
    const { result } = setup();

    act(() => {
      result.current.setSortOrder('amount-desc');
    });

    const amounts = result.current.filteredExpenses.map((e) => e.amount);
    expect(amounts).toEqual([100, 50, 20, 15]);
  });

  it('sorts by amount ascending', () => {
    const { result } = setup();

    act(() => {
      result.current.setSortOrder('amount-asc');
    });

    const amounts = result.current.filteredExpenses.map((e) => e.amount);
    expect(amounts).toEqual([15, 20, 50, 100]);
  });

  it('sorts by date ascending', () => {
    const { result } = setup();

    act(() => {
      result.current.setSortOrder('date-asc');
    });

    const dates = result.current.filteredExpenses.map((e) => e.date);
    expect(dates).toEqual([
      '2026-01-10',
      '2026-01-12',
      '2026-01-15',
      '2026-01-20',
    ]);
  });

  it('searches across all months when toggle is on', () => {
    const { result } = setup();

    act(() => {
      result.current.setIsSearchingAllMonths(true);
      result.current.setSearch('lunch');
    });

    // February lunch should be included
    expect(result.current.filteredExpenses).toHaveLength(1);
    expect(result.current.filteredExpenses[0].date).toBe('2026-02-05');
  });

  it('clears all filters', () => {
    const { result } = setup();

    act(() => {
      result.current.setSearch('test');
      result.current.setSelectedCategoryId('cat-1');
      result.current.setSelectedTagId('tag-1');
      result.current.setIsSearchingAllMonths(true);
    });

    act(() => {
      result.current.handleClearFilters();
    });

    expect(result.current.search).toBe('');
    expect(result.current.selectedCategoryId).toBeNull();
    expect(result.current.selectedTagId).toBeNull();
    expect(result.current.isSearchingAllMonths).toBe(false);
  });

  it('reports hasActiveFilters correctly', () => {
    const { result } = setup();
    expect(result.current.hasActiveFilters).toBe(false);

    act(() => {
      result.current.setSearch('x');
    });

    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('handleFilterChange sets search and category together', () => {
    const { result } = setup();

    act(() => {
      result.current.handleFilterChange('coffee', 'cat-1');
    });

    expect(result.current.search).toBe('coffee');
    expect(result.current.selectedCategoryId).toBe('cat-1');
  });

  // --- Date Range Presets ---
  it('filters by last7 date range preset', () => {
    vi.setSystemTime(new Date('2026-01-22'));
    const recentExpenses: Expense[] = [
      makeExpense({ id: '10', date: '2026-01-20', amount: 10 }),
      makeExpense({ id: '11', date: '2026-01-16', amount: 20 }),
      makeExpense({ id: '12', date: '2026-01-10', amount: 30 }), // older than 7 days
      makeExpense({ id: '13', date: '2026-02-01', amount: 40 }), // different month
    ];
    const { result } = renderHook(() =>
      useExpensesFilter({ expenses: recentExpenses, selectedMonth: '2026-01' }),
    );

    act(() => {
      result.current.setDateRangePreset('last7');
    });

    // Only expenses within last 7 days from 2026-01-22
    expect(
      result.current.filteredExpenses.every(
        (e) => new Date(e.date) >= new Date('2026-01-15'),
      ),
    ).toBe(true);
    vi.useRealTimers();
  });

  it('filters by thisYear date range preset', () => {
    vi.setSystemTime(new Date('2026-03-15'));
    const yearExpenses: Expense[] = [
      makeExpense({ id: '20', date: '2026-01-05', amount: 10 }),
      makeExpense({ id: '21', date: '2026-03-10', amount: 20 }),
      makeExpense({ id: '22', date: '2025-12-25', amount: 30 }), // previous year
    ];
    const { result } = renderHook(() =>
      useExpensesFilter({ expenses: yearExpenses, selectedMonth: '2026-01' }),
    );

    act(() => {
      result.current.setDateRangePreset('thisYear');
    });

    expect(result.current.filteredExpenses).toHaveLength(2);
    expect(
      result.current.filteredExpenses.every((e) => e.date.startsWith('2026')),
    ).toBe(true);
    vi.useRealTimers();
  });

  it('clears date range preset with handleClearFilters', () => {
    const { result } = setup();

    act(() => {
      result.current.setDateRangePreset('last30');
    });
    expect(result.current.dateRangePreset).toBe('last30');

    act(() => {
      result.current.handleClearFilters();
    });
    expect(result.current.dateRangePreset).toBeNull();
  });

  it('filters uncategorized expenses', () => {
    const withUncategorized: Expense[] = [
      ...expenses,
      makeExpense({
        id: '6',
        date: '2026-01-18',
        description: 'Random',
        category_id: null,
      }),
    ];
    const { result } = renderHook(() =>
      useExpensesFilter({
        expenses: withUncategorized,
        selectedMonth: '2026-01',
      }),
    );

    act(() => {
      result.current.setSelectedCategoryId('uncategorized');
    });

    expect(
      result.current.filteredExpenses.every((e) => e.category_id === null),
    ).toBe(true);
  });
});
