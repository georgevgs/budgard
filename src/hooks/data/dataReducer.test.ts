import { describe, expect, it } from 'vitest';
import {
  dataReducer,
  EMPTY_DATA,
  type DataState,
} from '@/hooks/data/dataReducer';
import type { DataSnapshot } from '@/lib/dataCache';
import type { Expense } from '@/types/Expense';

const expense = (id: string): Expense =>
  ({ id, amount: 1, description: id, date: '2026-08-01' }) as Expense;

const snapshot = (over: Partial<DataSnapshot> = {}): DataSnapshot =>
  ({
    categories: [],
    expenses: [expense('a')],
    incomes: [],
    recurringExpenses: [],
    recurringIncomes: [],
    tags: [],
    templates: [],
    categoryBudgets: [],
    accounts: [],
    goals: [],
    accountBalances: [],
    debts: [],
    noSpendDays: [],
    monthlyBudget: 1500,
    defaultCurrency: 'EUR',
    defaultSavingsPct: null,
    dailyReminderHour: null,
    notificationPreferences: {},
    secondaryLoaded: true,
    ...over,
  }) as DataSnapshot;

describe('set', () => {
  it('replaces one field and leaves the rest alone', () => {
    const next = dataReducer(EMPTY_DATA, {
      type: 'set',
      key: 'expenses',
      value: [expense('a')] as never,
    });

    expect(next.expenses).toHaveLength(1);
    expect(next.categories).toBe(EMPTY_DATA.categories);
  });

  // The dataOps hooks pass functional updates for optimistic writes and have
  // to keep being able to.
  it('accepts a functional update', () => {
    const start = { ...EMPTY_DATA, expenses: [expense('a')] };

    const next = dataReducer(start, {
      type: 'set',
      key: 'expenses',
      value: ((previous: Expense[]) => [...previous, expense('b')]) as never,
    });

    expect(next.expenses.map((row) => row.id)).toEqual(['a', 'b']);
  });

  // A refetch returning an identical array still produces a new reference.
  // Without the bail-out, every consumer of that slice re-renders for a fetch
  // that changed nothing.
  it('returns the same state when the value did not move', () => {
    const rows = [expense('a')];
    const start = { ...EMPTY_DATA, expenses: rows };

    const next = dataReducer(start, {
      type: 'set',
      key: 'expenses',
      value: rows as never,
    });

    expect(next).toBe(start);
  });

  it('still produces a new state object when it did move', () => {
    const start = { ...EMPTY_DATA, expenses: [expense('a')] };

    const next = dataReducer(start, {
      type: 'set',
      key: 'expenses',
      value: [expense('b')] as never,
    });

    expect(next).not.toBe(start);
  });
});

describe('hydrate', () => {
  it('applies everything the snapshot holds and marks the layer ready', () => {
    const next = dataReducer(EMPTY_DATA, {
      type: 'hydrate',
      snapshot: snapshot(),
    });

    expect(next.expenses).toHaveLength(1);
    expect(next.monthlyBudget).toBe(1500);
    expect(next.isInitialized).toBe(true);
    expect(next.isSecondaryLoaded).toBe(true);
  });

  // Hydrating a snapshot taken before the deferred stage finished must not
  // claim that stage is done, or those views flash empty instead of loading.
  it('does not claim the deferred stage finished when it had not', () => {
    const next = dataReducer(EMPTY_DATA, {
      type: 'hydrate',
      snapshot: snapshot({ secondaryLoaded: false }),
    });

    expect(next.isInitialized).toBe(true);
    expect(next.isSecondaryLoaded).toBe(false);
  });

  it('never writes the snapshot flag in as data', () => {
    const next = dataReducer(EMPTY_DATA, {
      type: 'hydrate',
      snapshot: snapshot(),
    });

    expect('secondaryLoaded' in next).toBe(false);
  });
});

describe('reset', () => {
  // The reason the reducer exists. The sign-out reset used to be a hand-written
  // list of twenty setter calls that had to be audited against the state shape
  // every time a field was added. Now it cannot drift, because it is the shape.
  it('leaves nothing of the previous account behind', () => {
    const loaded: DataState = {
      ...EMPTY_DATA,
      expenses: [expense('a')],
      monthlyBudget: 1500,
      defaultCurrency: 'GBP',
      isInitialized: true,
      isSecondaryLoaded: true,
      isHistoryLoaded: true,
    };

    expect(dataReducer(loaded, { type: 'reset' })).toEqual(EMPTY_DATA);
  });

  it('clears every field the state declares, with nothing exempt', () => {
    const dirty = Object.fromEntries(
      Object.keys(EMPTY_DATA).map((key) => [key, 'dirty']),
    ) as unknown as DataState;

    const next = dataReducer(dirty, { type: 'reset' });

    for (const key of Object.keys(EMPTY_DATA)) {
      expect(next[key as keyof DataState]).not.toBe('dirty');
    }
  });
});

describe('applyPrimary', () => {
  it('commits the first fetch stage in one go', () => {
    const next = dataReducer(EMPTY_DATA, {
      type: 'applyPrimary',
      values: {
        expenses: [expense('a')],
        monthlyBudget: 900,
        isInitialized: true,
      },
    });

    expect(next.expenses).toHaveLength(1);
    expect(next.monthlyBudget).toBe(900);
    expect(next.isInitialized).toBe(true);
    expect(next.incomes).toEqual([]);
  });
});
