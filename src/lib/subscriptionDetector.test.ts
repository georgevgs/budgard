import { describe, it, expect } from 'vitest';
import {
  detectPriceDrift,
  detectSubscriptions,
  normalizeDescription,
} from './subscriptionDetector';
import type { Expense } from '@/types/Expense';
import type { RecurringExpense } from '@/types/RecurringExpense';

const buildExpense = (overrides: Partial<Expense>): Expense => ({
  id: 'e-' + Math.random(),
  amount: 9.99,
  description: 'Netflix',
  date: '2026-01-01',
  user_id: 'u1',
  created_at: '',
  ...overrides,
});

const buildRecurring = (
  overrides: Partial<RecurringExpense>,
): RecurringExpense => ({
  id: 'r-' + Math.random(),
  user_id: 'u1',
  amount: 9.99,
  description: 'Netflix',
  frequency: 'monthly',
  start_date: '2026-01-01',
  active: true,
  created_at: '',
  ...overrides,
});

describe('normalizeDescription', () => {
  it('lowercases and trims', () => {
    expect(normalizeDescription('  Netflix  ')).toBe('netflix');
  });

  it('collapses whitespace', () => {
    expect(normalizeDescription('Netflix   Premium')).toBe('netflix premium');
  });

  it('strips trailing dates', () => {
    expect(normalizeDescription('Netflix 12/05')).toBe('netflix');
    expect(normalizeDescription('Spotify 2026-04')).toBe('spotify');
  });

  it('strips trailing reference numbers', () => {
    expect(normalizeDescription('iCloud 1234567')).toBe('icloud');
  });
});

describe('detectSubscriptions', () => {
  it('detects a monthly subscription with 3+ occurrences', () => {
    const expenses = [
      buildExpense({ date: '2026-01-05', description: 'Netflix' }),
      buildExpense({ date: '2026-02-05', description: 'Netflix' }),
      buildExpense({ date: '2026-03-05', description: 'Netflix' }),
    ];

    const result = detectSubscriptions(expenses);

    expect(result).toHaveLength(1);
    expect(result[0].frequency).toBe('monthly');
    expect(result[0].occurrences).toBe(3);
    expect(result[0].description).toBe('Netflix');
  });

  it('detects yearly subscriptions', () => {
    const expenses = [
      buildExpense({ date: '2024-04-01', description: 'iCloud', amount: 50 }),
      buildExpense({ date: '2025-04-01', description: 'iCloud', amount: 50 }),
      buildExpense({ date: '2026-04-01', description: 'iCloud', amount: 50 }),
    ];

    const result = detectSubscriptions(expenses);

    expect(result).toHaveLength(1);
    expect(result[0].frequency).toBe('yearly');
  });

  it('does not detect with fewer than 3 occurrences', () => {
    const expenses = [
      buildExpense({ date: '2026-01-05', description: 'Netflix' }),
      buildExpense({ date: '2026-02-05', description: 'Netflix' }),
    ];

    expect(detectSubscriptions(expenses)).toHaveLength(0);
  });

  it('rejects irregular cadences', () => {
    const expenses = [
      buildExpense({ date: '2026-01-01', description: 'Random' }),
      buildExpense({ date: '2026-01-10', description: 'Random' }),
      buildExpense({ date: '2026-03-15', description: 'Random' }),
    ];

    expect(detectSubscriptions(expenses)).toHaveLength(0);
  });

  it('rejects high-variance amounts', () => {
    const expenses = [
      buildExpense({ date: '2026-01-05', description: 'Coffee', amount: 4 }),
      buildExpense({ date: '2026-02-05', description: 'Coffee', amount: 7.5 }),
      buildExpense({ date: '2026-03-05', description: 'Coffee', amount: 3 }),
    ];

    expect(detectSubscriptions(expenses)).toHaveLength(0);
  });

  it('reports the latest amount, not the median, when prices drift up within tolerance', () => {
    // 9.99 → 10.49 → 10.49: median is 10.49, latest is 10.49. Trivial.
    // Use 9.99 → 10.49 → 10.49 with median 10.49, latest 10.49 — same value.
    // The interesting case: 9.99 → 9.99 → 10.49 (median 9.99, latest 10.49).
    const expenses = [
      buildExpense({
        date: '2026-01-05',
        description: 'Netflix',
        amount: 9.99,
      }),
      buildExpense({
        date: '2026-02-05',
        description: 'Netflix',
        amount: 9.99,
      }),
      buildExpense({
        date: '2026-03-05',
        description: 'Netflix',
        amount: 10.49,
      }),
    ];

    const [detected] = detectSubscriptions(expenses);

    expect(detected.amount).toBe(10.49);
    expect(detected.lastDate).toBe('2026-03-05');
  });

  it('skips expenses already linked to a recurring expense', () => {
    const expenses = [
      buildExpense({
        date: '2026-01-05',
        description: 'Netflix',
        recurring_expense_id: 'r1',
      }),
      buildExpense({
        date: '2026-02-05',
        description: 'Netflix',
        recurring_expense_id: 'r1',
      }),
      buildExpense({
        date: '2026-03-05',
        description: 'Netflix',
        recurring_expense_id: 'r1',
      }),
    ];

    expect(detectSubscriptions(expenses)).toHaveLength(0);
  });

  it('skips detections that match an existing recurring expense', () => {
    const expenses = [
      buildExpense({ date: '2026-01-05', description: 'Netflix' }),
      buildExpense({ date: '2026-02-05', description: 'Netflix' }),
      buildExpense({ date: '2026-03-05', description: 'Netflix' }),
    ];
    const existing = [buildRecurring({ description: 'NETFLIX' })];

    expect(detectSubscriptions(expenses, existing)).toHaveLength(0);
  });

  it('groups by normalized description across casing and dates', () => {
    const expenses = [
      buildExpense({ date: '2026-01-05', description: 'Spotify 01/05' }),
      buildExpense({ date: '2026-02-05', description: 'spotify 02/05' }),
      buildExpense({ date: '2026-03-05', description: 'SPOTIFY' }),
    ];

    const result = detectSubscriptions(expenses);

    expect(result).toHaveLength(1);
    expect(result[0].normalizedDescription).toBe('spotify');
  });

  it('returns the most common category among matches', () => {
    const expenses = [
      buildExpense({
        date: '2026-01-05',
        description: 'Netflix',
        category_id: 'streaming',
      }),
      buildExpense({
        date: '2026-02-05',
        description: 'Netflix',
        category_id: 'streaming',
      }),
      buildExpense({
        date: '2026-03-05',
        description: 'Netflix',
        category_id: 'fun',
      }),
    ];

    const result = detectSubscriptions(expenses);

    expect(result[0].category_id).toBe('streaming');
  });
});

describe('detectPriceDrift', () => {
  it('flags upward drift above 5%', () => {
    const sub = buildRecurring({ id: 'r1', amount: 9.99 });
    const expenses = [
      buildExpense({
        recurring_expense_id: 'r1',
        amount: 11.99,
        date: '2026-04-05',
      }),
    ];

    const drift = detectPriceDrift(sub, expenses);

    expect(drift).not.toBeNull();
    expect(drift?.deltaPct).toBeGreaterThan(0);
    expect(drift?.latestAmount).toBe(11.99);
  });

  it('flags downward drift', () => {
    const sub = buildRecurring({ id: 'r1', amount: 20 });
    const expenses = [
      buildExpense({
        recurring_expense_id: 'r1',
        amount: 15,
        date: '2026-04-05',
      }),
    ];

    expect(detectPriceDrift(sub, expenses)?.deltaPct).toBeLessThan(0);
  });

  it('ignores drift below threshold', () => {
    const sub = buildRecurring({ id: 'r1', amount: 9.99 });
    const expenses = [
      buildExpense({
        recurring_expense_id: 'r1',
        amount: 10.2,
        date: '2026-04-05',
      }),
    ];

    expect(detectPriceDrift(sub, expenses)).toBeNull();
  });

  it('uses the most recent linked expense', () => {
    const sub = buildRecurring({ id: 'r1', amount: 9.99 });
    const expenses = [
      buildExpense({
        recurring_expense_id: 'r1',
        amount: 9.99,
        date: '2026-02-05',
      }),
      buildExpense({
        recurring_expense_id: 'r1',
        amount: 13.99,
        date: '2026-04-05',
      }),
    ];

    expect(detectPriceDrift(sub, expenses)?.latestAmount).toBe(13.99);
  });

  it('returns null for inactive subscriptions', () => {
    const sub = buildRecurring({ id: 'r1', amount: 9.99, active: false });
    const expenses = [
      buildExpense({
        recurring_expense_id: 'r1',
        amount: 11.99,
        date: '2026-04-05',
      }),
    ];

    expect(detectPriceDrift(sub, expenses)).toBeNull();
  });

  it('returns null when no linked expenses exist', () => {
    const sub = buildRecurring({ id: 'r1', amount: 9.99 });

    expect(detectPriceDrift(sub, [])).toBeNull();
  });
});
