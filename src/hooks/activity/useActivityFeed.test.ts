import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActivityFeed } from '@/hooks/activity/useActivityFeed';
import { UNCATEGORIZED_VALUE } from '@/lib/expenseFilters';
import type { Expense } from '@/types/Expense';

let incomesMock: Expense[] = [];

vi.mock('@/contexts/DataContext', () => ({
  useIncomesData: () => incomesMock,
}));

const row = (over: Partial<Expense>): Expense =>
  ({
    id: 'x',
    description: 'Something',
    amount: 10,
    date: '2026-08-05',
    created_at: '2026-08-05T10:00:00Z',
    category_id: 'cat-1',
    category: { id: 'cat-1', name: 'Groceries' },
    ...over,
  }) as unknown as Expense;

describe('useActivityFeed', () => {
  beforeEach(() => {
    incomesMock = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-07T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows only the selected month by default', () => {
    const { result } = renderHook(() =>
      useActivityFeed([
        row({ id: 'aug', date: '2026-08-05' }),
        row({ id: 'jul', date: '2026-07-05' }),
      ]),
    );

    expect(result.current.filteredRows.map((r) => r.id)).toEqual(['aug']);
  });

  it('reaches past the selected month once the period widens', () => {
    const { result } = renderHook(() =>
      useActivityFeed([
        row({ id: 'aug', date: '2026-08-05' }),
        row({ id: 'jan', date: '2026-01-05' }),
      ]),
    );

    act(() => result.current.setPeriod('all'));

    expect(result.current.filteredRows.map((r) => r.id)).toEqual([
      'aug',
      'jan',
    ]);
  });

  it('honours rolling-day windows', () => {
    const { result } = renderHook(() =>
      useActivityFeed([
        row({ id: 'recent', date: '2026-08-05' }),
        row({ id: 'old', date: '2026-07-01' }),
      ]),
    );

    act(() => result.current.setPeriod('last7'));

    expect(result.current.filteredRows.map((r) => r.id)).toEqual(['recent']);
  });

  it('searches all history without losing the chosen period', () => {
    const { result } = renderHook(() =>
      useActivityFeed([
        row({ id: 'aug', description: 'Coffee', date: '2026-08-05' }),
        row({ id: 'jun', description: 'Dentist', date: '2026-06-05' }),
      ]),
    );

    act(() => result.current.setSearch('dentist'));

    expect(result.current.filteredRows.map((item) => item.id)).toEqual(['jun']);
    expect(result.current.effectivePeriod).toBe('all');
    expect(result.current.period).toBe('month');

    act(() => result.current.setSearch(''));

    expect(result.current.filteredRows.map((item) => item.id)).toEqual(['aug']);
    expect(result.current.effectivePeriod).toBe('month');
  });

  it('filters by category, including uncategorized', () => {
    const { result } = renderHook(() =>
      useActivityFeed([
        row({ id: 'grocery', category_id: 'cat-1' }),
        row({ id: 'loose', category_id: null, category: undefined }),
      ]),
    );

    act(() => result.current.setSelectedCategoryId('cat-1'));
    expect(result.current.filteredRows.map((r) => r.id)).toEqual(['grocery']);

    act(() => result.current.setSelectedCategoryId(UNCATEGORIZED_VALUE));
    expect(result.current.filteredRows.map((r) => r.id)).toEqual(['loose']);
  });

  it('separates expense and income totals', () => {
    incomesMock = [row({ id: 'salary', amount: 100, date: '2026-08-03' })];
    const { result } = renderHook(() =>
      useActivityFeed([row({ id: 'spend', amount: 30, date: '2026-08-04' })]),
    );

    expect(result.current.expenseTotal).toBe(30);
    expect(result.current.incomeTotal).toBe(100);
  });

  it('treats the month selector as scope, not as an active filter', () => {
    const { result } = renderHook(() => useActivityFeed([row({})]));

    expect(result.current.hasActiveFilters).toBe(false);

    act(() => result.current.setSearch('coffee'));

    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('names the export after the period in view', () => {
    const { result } = renderHook(() => useActivityFeed([row({})]));

    expect(result.current.exportScope).toBe('2026-08');

    act(() => result.current.setPeriod('thisYear'));

    expect(result.current.exportScope).toBe('thisYear');

    act(() => result.current.setSearch('something'));

    expect(result.current.exportScope).toBe('all');
  });

  // Search reaches a note now that transactions carry one.
  it('finds a transaction by its note', () => {
    const { result } = renderHook(() =>
      useActivityFeed([
        row({ id: 'a', description: 'Card payment', note: 'Anna birthday' }),
        row({ id: 'b', description: 'Card payment' }),
      ]),
    );

    act(() => result.current.setSearch('birthday'));

    expect(result.current.filteredRows.map((r) => r.id)).toEqual(['a']);
  });

  // People remember money as a number long after forgetting what they called it.
  it('finds a transaction by its amount', () => {
    const { result } = renderHook(() =>
      useActivityFeed([
        row({ id: 'a', description: 'Anonymous', amount: 45.9 }),
        row({ id: 'b', description: 'Anonymous', amount: 12 }),
      ]),
    );

    act(() => result.current.setSearch('45'));

    expect(result.current.filteredRows.map((r) => r.id)).toEqual(['a']);
  });

  // The app formats with a comma; a phone keypad offers a dot. Both work.
  it('accepts either decimal separator when searching an amount', () => {
    const rows = [row({ id: 'a', description: 'Anonymous', amount: 45.9 })];

    const comma = renderHook(() => useActivityFeed(rows));
    act(() => comma.result.current.setSearch('45,90'));
    expect(comma.result.current.filteredRows.map((r) => r.id)).toEqual(['a']);

    const dot = renderHook(() => useActivityFeed(rows));
    act(() => dot.result.current.setSearch('45.90'));
    expect(dot.result.current.filteredRows.map((r) => r.id)).toEqual(['a']);
  });

  // A refund is stored as a negative expense; searching its size should still
  // find it rather than requiring the user to type a minus sign.
  it('matches a refund by its size', () => {
    const { result } = renderHook(() =>
      useActivityFeed([row({ id: 'a', description: 'Refund', amount: -30 })]),
    );

    act(() => result.current.setSearch('30'));

    expect(result.current.filteredRows.map((r) => r.id)).toEqual(['a']);
  });
});
