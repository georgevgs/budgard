import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  loadDataSnapshot,
  saveDataSnapshot,
  clearDataSnapshot,
  getRecentCutoff,
  isMonthPendingHistory,
  type DataSnapshot,
} from '@/lib/dataCache';
import type { Expense } from '@/types/Expense';

const CACHE_KEY = 'budgard-data-snapshot';
const USER_ID = 'user-1';

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'exp-1',
  amount: 10,
  description: 'Coffee',
  date: '2026-06-01',
  user_id: USER_ID,
  created_at: '2026-06-01T10:00:00Z',
  ...overrides,
});

const makeSnapshot = (overrides: Partial<DataSnapshot> = {}): DataSnapshot => ({
  categories: [],
  expenses: [],
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
  monthlyBudget: 1500,
  defaultCurrency: 'EUR',
  defaultSavingsPct: null,
  dailyReminderHour: null,
  notificationPreferences: {},
  secondaryLoaded: true,
  ...overrides,
});

describe('dataCache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('round-trips a snapshot for the same user', () => {
    const snapshot = makeSnapshot({ expenses: [makeExpense()] });
    saveDataSnapshot(USER_ID, snapshot);

    const loaded = loadDataSnapshot(USER_ID);

    expect(loaded).not.toBeNull();
    expect(loaded?.expenses).toHaveLength(1);
    expect(loaded?.monthlyBudget).toBe(1500);
    expect(loaded?.defaultCurrency).toBe('EUR');
  });

  it('returns null when no snapshot exists', () => {
    expect(loadDataSnapshot(USER_ID)).toBeNull();
  });

  it('returns null for a different user and purges the foreign snapshot', () => {
    saveDataSnapshot(USER_ID, makeSnapshot());

    expect(loadDataSnapshot('someone-else')).toBeNull();
    // A different account boots: user A's snapshot must not linger in storage.
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it('returns null when the stored version does not match', () => {
    saveDataSnapshot(USER_ID, makeSnapshot());
    const stored = JSON.parse(localStorage.getItem(CACHE_KEY)!);
    stored.version = 999;
    localStorage.setItem(CACHE_KEY, JSON.stringify(stored));

    expect(loadDataSnapshot(USER_ID)).toBeNull();
  });

  it('returns null when the snapshot is too old', () => {
    saveDataSnapshot(USER_ID, makeSnapshot());
    const stored = JSON.parse(localStorage.getItem(CACHE_KEY)!);
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    stored.savedAt = eightDaysAgo.toISOString();
    localStorage.setItem(CACHE_KEY, JSON.stringify(stored));

    expect(loadDataSnapshot(USER_ID)).toBeNull();
  });

  it('returns null when the savedAt timestamp is in the future', () => {
    saveDataSnapshot(USER_ID, makeSnapshot());
    const stored = JSON.parse(localStorage.getItem(CACHE_KEY)!);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    stored.savedAt = tomorrow.toISOString();
    localStorage.setItem(CACHE_KEY, JSON.stringify(stored));

    expect(loadDataSnapshot(USER_ID)).toBeNull();
  });

  it('returns null for corrupted JSON', () => {
    localStorage.setItem(CACHE_KEY, 'not-json{');

    expect(loadDataSnapshot(USER_ID)).toBeNull();
  });

  it('returns null when a data array is missing', () => {
    saveDataSnapshot(USER_ID, makeSnapshot());
    const stored = JSON.parse(localStorage.getItem(CACHE_KEY)!);
    delete stored.data.expenses;
    localStorage.setItem(CACHE_KEY, JSON.stringify(stored));

    expect(loadDataSnapshot(USER_ID)).toBeNull();
  });

  it('returns null when monthlyBudget is not a number or null', () => {
    saveDataSnapshot(USER_ID, makeSnapshot());
    const stored = JSON.parse(localStorage.getItem(CACHE_KEY)!);
    stored.data.monthlyBudget = '1500';
    localStorage.setItem(CACHE_KEY, JSON.stringify(stored));

    expect(loadDataSnapshot(USER_ID)).toBeNull();
  });

  it('accepts a null monthlyBudget', () => {
    saveDataSnapshot(USER_ID, makeSnapshot({ monthlyBudget: null }));

    expect(loadDataSnapshot(USER_ID)?.monthlyBudget).toBeNull();
  });

  it('returns null when defaultCurrency is an empty string', () => {
    saveDataSnapshot(USER_ID, makeSnapshot());
    const stored = JSON.parse(localStorage.getItem(CACHE_KEY)!);
    stored.data.defaultCurrency = '';
    localStorage.setItem(CACHE_KEY, JSON.stringify(stored));

    expect(loadDataSnapshot(USER_ID)).toBeNull();
  });

  it('returns null when notificationPreferences is missing', () => {
    saveDataSnapshot(USER_ID, makeSnapshot());
    const stored = JSON.parse(localStorage.getItem(CACHE_KEY)!);
    delete stored.data.notificationPreferences;
    localStorage.setItem(CACHE_KEY, JSON.stringify(stored));

    expect(loadDataSnapshot(USER_ID)).toBeNull();
  });

  it('trims expenses and incomes older than the recent window on save', () => {
    const recent = makeExpense({ id: 'recent', date: '2026-06-01' });
    const ancient = makeExpense({ id: 'ancient', date: '2020-01-01' });
    saveDataSnapshot(
      USER_ID,
      makeSnapshot({ expenses: [recent, ancient], incomes: [ancient] }),
    );

    const loaded = loadDataSnapshot(USER_ID);

    expect(loaded?.expenses.map((e) => e.id)).toEqual(['recent']);
    expect(loaded?.incomes).toHaveLength(0);
  });

  it('getRecentCutoff returns a YYYY-MM-DD date 12 months back', () => {
    const cutoff = getRecentCutoff();

    expect(cutoff).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const expected = new Date();
    expected.setMonth(expected.getMonth() - 12);
    expect(cutoff).toBe(expected.toISOString().split('T')[0]);
  });

  it('isMonthPendingHistory flags months at or before the cutoff month', () => {
    const cutoffMonth = getRecentCutoff().slice(0, 7);
    const monthBefore = new Date(`${cutoffMonth}-01T00:00:00Z`);
    monthBefore.setUTCMonth(monthBefore.getUTCMonth() - 1);
    const monthAfter = new Date(`${cutoffMonth}-01T00:00:00Z`);
    monthAfter.setUTCMonth(monthAfter.getUTCMonth() + 1);

    const toMonth = (date: Date) => date.toISOString().slice(0, 7);

    expect(isMonthPendingHistory(toMonth(monthBefore))).toBe(true);
    // The cutoff falls mid-month, so stage 1 covers only part of that month.
    expect(isMonthPendingHistory(cutoffMonth)).toBe(true);
    expect(isMonthPendingHistory(toMonth(monthAfter))).toBe(false);
    expect(isMonthPendingHistory(new Date().toISOString().slice(0, 7))).toBe(
      false,
    );
  });

  it('clearDataSnapshot removes the stored snapshot', () => {
    saveDataSnapshot(USER_ID, makeSnapshot());
    clearDataSnapshot();

    expect(loadDataSnapshot(USER_ID)).toBeNull();
  });

  it('drops any existing snapshot when the write fails', () => {
    saveDataSnapshot(USER_ID, makeSnapshot());
    expect(loadDataSnapshot(USER_ID)).not.toBeNull();

    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

    expect(() => saveDataSnapshot(USER_ID, makeSnapshot())).not.toThrow();

    setItem.mockRestore();
    expect(loadDataSnapshot(USER_ID)).toBeNull();
  });
});
