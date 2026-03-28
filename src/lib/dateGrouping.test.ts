import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enUS, el } from 'date-fns/locale';
import { getDateLabel, groupExpensesByDate } from './dateGrouping';
import type { Expense } from '@/types/Expense';

const t = (key: string) => key;

const makeExpense = (id: string, date: string, amount = 10): Expense => ({
  id,
  date,
  amount,
  description: 'Test',
  user_id: 'u1',
  created_at: `${date}T10:00:00Z`,
});

describe('getDateLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));
  });

  it('returns "today" key for today\'s date', () => {
    const label = getDateLabel('2026-03-15', enUS, t);
    expect(label).toBe('dateGroup.today');
  });

  it('returns "yesterday" key for yesterday\'s date', () => {
    const label = getDateLabel('2026-03-14', enUS, t);
    expect(label).toBe('dateGroup.yesterday');
  });

  it('returns formatted date for older dates', () => {
    const label = getDateLabel('2026-03-10', enUS, t);
    expect(label).toBe('Tuesday, Mar 10');
  });

  it('skips today/yesterday labels when showFullDate is true', () => {
    const todayLabel = getDateLabel('2026-03-15', enUS, t, true);
    expect(todayLabel).toBe('Sunday, Mar 15');

    const yesterdayLabel = getDateLabel('2026-03-14', enUS, t, true);
    expect(yesterdayLabel).toBe('Saturday, Mar 14');
  });

  it('formats with Greek locale', () => {
    const label = getDateLabel('2026-03-10', el, t);
    // Greek locale returns Greek day/month names
    expect(label).toBeTruthy();
    expect(label).not.toBe('dateGroup.today');
    expect(label).not.toBe('dateGroup.yesterday');
  });
});

describe('groupExpensesByDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));
  });

  it('groups expenses by date', () => {
    const expenses = [
      makeExpense('1', '2026-03-15', 10),
      makeExpense('2', '2026-03-15', 20),
      makeExpense('3', '2026-03-14', 30),
    ];

    const groups = groupExpensesByDate(expenses, enUS, t);

    expect(groups).toHaveLength(2);
    expect(groups[0].date).toBe('2026-03-15');
    expect(groups[0].expenses).toHaveLength(2);
    expect(groups[0].label).toBe('dateGroup.today');
    expect(groups[1].date).toBe('2026-03-14');
    expect(groups[1].expenses).toHaveLength(1);
    expect(groups[1].label).toBe('dateGroup.yesterday');
  });

  it('returns empty array for no expenses', () => {
    const groups = groupExpensesByDate([], enUS, t);
    expect(groups).toHaveLength(0);
  });

  it('preserves expense order within groups', () => {
    const expenses = [
      makeExpense('1', '2026-03-10', 50),
      makeExpense('2', '2026-03-10', 30),
      makeExpense('3', '2026-03-10', 10),
    ];

    const groups = groupExpensesByDate(expenses, enUS, t);

    expect(groups).toHaveLength(1);
    expect(groups[0].expenses[0].id).toBe('1');
    expect(groups[0].expenses[1].id).toBe('2');
    expect(groups[0].expenses[2].id).toBe('3');
  });

  it('creates separate groups for each unique date', () => {
    const expenses = [
      makeExpense('1', '2026-03-10'),
      makeExpense('2', '2026-03-11'),
      makeExpense('3', '2026-03-12'),
    ];

    const groups = groupExpensesByDate(expenses, enUS, t);
    expect(groups).toHaveLength(3);
  });

  it('uses full date format when showFullDate is true', () => {
    const expenses = [makeExpense('1', '2026-03-15')];

    const groups = groupExpensesByDate(expenses, enUS, t, true);

    expect(groups[0].label).toBe('Sunday, Mar 15');
  });
});
