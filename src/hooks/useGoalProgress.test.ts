import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGoalProgress, useAllGoalProgress } from './useGoalProgress';
import type { Expense } from '@/types/Expense';
import type { Goal } from '@/types/Goal';

let dataMock: {
  expenses: Expense[];
  incomes: Expense[];
  goals: Goal[];
} = { expenses: [], incomes: [], goals: [] };

vi.mock('@/contexts/DataContext', () => ({
  useExpensesData: () => dataMock.expenses,
  useIncomesData: () => dataMock.incomes,
  useGoalsData: () => dataMock.goals,
}));

const makeExpense = (
  date: string,
  amount: number,
  overrides: Partial<Expense> = {},
): Expense => ({
  id: crypto.randomUUID(),
  date,
  amount,
  description: 'Test',
  category_id: null,
  user_id: 'u1',
  created_at: date + 'T10:00:00Z',
  ...overrides,
});

const makeGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: 'g1',
  user_id: 'u1',
  name: 'Vacation',
  target_amount: 1000,
  currency: 'EUR',
  deadline: null,
  start_date: '2026-01-01',
  source_type: 'net_delta',
  category_id: null,
  tag_id: null,
  icon: 'target',
  color: '#f97316',
  is_completed: false,
  completed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('useGoalProgress', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-04-01'));
    dataMock = { expenses: [], incomes: [], goals: [] };
  });

  describe('source: category', () => {
    it('sums expenses in the chosen category since start_date', () => {
      dataMock = {
        expenses: [
          makeExpense('2026-02-15', 200, { category_id: 'savings' }),
          makeExpense('2026-03-15', 150, { category_id: 'savings' }),
          makeExpense('2026-03-15', 80, { category_id: 'food' }),
          // Before start_date — must be excluded
          makeExpense('2025-12-31', 999, { category_id: 'savings' }),
        ],
        incomes: [],
        goals: [],
      };
      const goal = makeGoal({
        source_type: 'category',
        category_id: 'savings',
      });

      const { result } = renderHook(() => useGoalProgress(goal));

      expect(result.current.current).toBe(350);
      expect(result.current.target).toBe(1000);
      expect(result.current.percent).toBeCloseTo(0.35, 5);
    });

    it('returns 0 progress when category_id is missing', () => {
      const goal = makeGoal({ source_type: 'category', category_id: null });

      const { result } = renderHook(() => useGoalProgress(goal));

      expect(result.current.current).toBe(0);
    });
  });

  describe('source: tag', () => {
    it('sums expenses with the chosen tag since start_date', () => {
      dataMock = {
        expenses: [
          makeExpense('2026-02-01', 100, { tag_id: 'travel' }),
          makeExpense('2026-03-01', 250, { tag_id: 'travel' }),
          makeExpense('2026-03-15', 50, { tag_id: 'other' }),
        ],
        incomes: [],
        goals: [],
      };
      const goal = makeGoal({ source_type: 'tag', tag_id: 'travel' });

      const { result } = renderHook(() => useGoalProgress(goal));

      expect(result.current.current).toBe(350);
    });
  });

  describe('source: net_delta', () => {
    it('returns income minus expenses since start_date', () => {
      dataMock = {
        expenses: [makeExpense('2026-02-01', 200), makeExpense('2026-03-01', 100)],
        incomes: [makeExpense('2026-02-15', 800), makeExpense('2026-03-10', 500)],
        goals: [],
      };
      const goal = makeGoal({ source_type: 'net_delta' });

      const { result } = renderHook(() => useGoalProgress(goal));

      // income 1300 − expenses 300 = 1000
      expect(result.current.current).toBe(1000);
      expect(result.current.percent).toBe(1);
    });

    it('reports negative current when expenses exceed income (deficit)', () => {
      dataMock = {
        expenses: [makeExpense('2026-03-01', 1000)],
        incomes: [makeExpense('2026-03-01', 200)],
        goals: [],
      };
      const goal = makeGoal({ source_type: 'net_delta' });

      const { result } = renderHook(() => useGoalProgress(goal));

      // -800 surfaces the deficit to the user; percent stays clamped at 0.
      expect(result.current.current).toBe(-800);
      expect(result.current.percent).toBe(0);
      expect(result.current.isOverachieved).toBe(false);
    });
  });

  describe('overachievement', () => {
    it('flags isOverachieved when current > target and caps percent at 1', () => {
      dataMock = {
        expenses: [],
        incomes: [makeExpense('2026-03-01', 1500)],
        goals: [],
      };
      const goal = makeGoal({ target_amount: 1000, source_type: 'net_delta' });

      const { result } = renderHook(() => useGoalProgress(goal));

      expect(result.current.isOverachieved).toBe(true);
      expect(result.current.percent).toBe(1);
    });
  });

  describe('deadline', () => {
    it('returns null daysRemaining when no deadline is set', () => {
      const goal = makeGoal({ deadline: null });

      const { result } = renderHook(() => useGoalProgress(goal));

      expect(result.current.daysRemaining).toBeNull();
      expect(result.current.isOverdue).toBe(false);
      expect(result.current.isOnTrack).toBeNull();
    });

    it('reports days remaining for a future deadline', () => {
      const goal = makeGoal({ deadline: '2026-04-11' }); // 10 days from 2026-04-01

      const { result } = renderHook(() => useGoalProgress(goal));

      expect(result.current.daysRemaining).toBe(10);
      expect(result.current.isOverdue).toBe(false);
    });

    it('flags overdue when deadline is past and goal not reached', () => {
      const goal = makeGoal({ deadline: '2026-03-01' });

      const { result } = renderHook(() => useGoalProgress(goal));

      expect(result.current.isOverdue).toBe(true);
      expect(result.current.daysRemaining).toBe(-31);
    });
  });

  describe('on-track logic', () => {
    it('marks behind when pace is below required pace', () => {
      // 90 days elapsed, 10 days left, target 1000, current 100 → way behind
      dataMock = {
        expenses: [],
        incomes: [makeExpense('2026-02-01', 100)],
        goals: [],
      };
      const goal = makeGoal({
        deadline: '2026-04-11',
        target_amount: 1000,
        source_type: 'net_delta',
      });

      const { result } = renderHook(() => useGoalProgress(goal));

      expect(result.current.isOnTrack).toBe(false);
    });

    it('marks on-track when pace meets required', () => {
      // current already at target
      dataMock = {
        expenses: [],
        incomes: [makeExpense('2026-03-01', 1000)],
        goals: [],
      };
      const goal = makeGoal({
        deadline: '2026-04-11',
        target_amount: 1000,
        source_type: 'net_delta',
      });

      const { result } = renderHook(() => useGoalProgress(goal));

      expect(result.current.isOnTrack).toBe(true);
    });
  });
});

describe('useAllGoalProgress', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-04-01'));
  });

  it('returns a progress entry per goal keyed by id', () => {
    const g1 = makeGoal({ id: 'g1', target_amount: 100 });
    const g2 = makeGoal({ id: 'g2', target_amount: 500 });
    dataMock = {
      expenses: [],
      incomes: [makeExpense('2026-03-01', 50)],
      goals: [g1, g2],
    };

    const { result } = renderHook(() => useAllGoalProgress());

    expect(result.current.g1.current).toBe(50);
    expect(result.current.g2.current).toBe(50);
    expect(result.current.g1.percent).toBe(0.5);
    expect(result.current.g2.percent).toBeCloseTo(0.1, 5);
  });
});
