import { useMemo } from 'react';
import {
  useExpensesData,
  useIncomesData,
  useGoalsData,
} from '@/contexts/DataContext';
import type { Expense } from '@/types/Expense';
import type { Goal } from '@/types/Goal';

export type GoalProgress = {
  goalId: string;
  current: number;
  target: number;
  percent: number; // 0..1, capped at 1 for display
  isOverachieved: boolean;
  daysRemaining: number | null;
  isOverdue: boolean;
  isOnTrack: boolean | null; // null when no deadline
  pacePerDay: number | null;
  requiredPerDay: number | null;
}

export const useGoalProgress = (goal: Goal): GoalProgress => {
  const expenses = useExpensesData();
  const incomes = useIncomesData();

  return useMemo(
    () => computeProgress(goal, expenses, incomes),
    [goal, expenses, incomes],
  );
}

export const useAllGoalProgress = (): Record<string, GoalProgress> => {
  const goals = useGoalsData();
  const expenses = useExpensesData();
  const incomes = useIncomesData();

  return useMemo(() => {
    const map: Record<string, GoalProgress> = {};
    for (const goal of goals) {
      map[goal.id] = computeProgress(goal, expenses, incomes);
    }

    return map;
  }, [goals, expenses, incomes]);
}

// --- Helpers ---

const computeProgress = (
  goal: Goal,
  expenses: Expense[],
  incomes: Expense[],
): GoalProgress => {
  // Parse YYYY-MM-DD as local midnight; `new Date('YYYY-MM-DD')` parses as UTC
  // and shifts the day in negative-UTC timezones.
  const startDate = new Date(goal.start_date + 'T00:00:00');

  const current = sumForSource(goal, expenses, incomes, goal.start_date);
  const target = Number(goal.target_amount);
  let ratio = 0;
  if (target > 0) {
    ratio = current / target;
  }
  const percent = Math.max(0, Math.min(1, ratio));
  const isOverachieved = ratio > 1;

  const { daysRemaining, isOverdue } = computeDeadlineState(goal.deadline);
  const { isOnTrack, pacePerDay, requiredPerDay } = computePace(
    current,
    target,
    startDate,
    daysRemaining,
  );

  return {
    goalId: goal.id,
    current,
    target,
    percent,
    isOverachieved,
    daysRemaining,
    isOverdue,
    isOnTrack,
    pacePerDay,
    requiredPerDay,
  };
}

const sumForSource = (
  goal: Goal,
  expenses: Expense[],
  incomes: Expense[],
  startDate: string,
): number => {
  if (goal.source_type === 'category') {
    if (!goal.category_id) return 0;

    return sumExpenses(
      expenses.filter(
        (e) =>
          e.category_id === goal.category_id &&
          e.date >= startDate,
      ),
    );
  }

  if (goal.source_type === 'tag') {
    if (!goal.tag_id) return 0;

    return sumExpenses(
      expenses.filter(
        (e) => e.tag_id === goal.tag_id && e.date >= startDate,
      ),
    );
  }

  // net_delta — total income minus total expenses since start_date.
  // Don't clamp at zero: a negative current is the user actually running a
  // deficit, and the progress card should reflect it (formatCurrency renders
  // it as "-€200" / "€1,000"). The percent display handles the clamp itself.
  const incomeSum = sumExpenses(
    incomes.filter((i) => i.date >= startDate),
  );
  const expenseSum = sumExpenses(
    expenses.filter((e) => e.date >= startDate),
  );

  return incomeSum - expenseSum;
}

const sumExpenses = (rows: Expense[]): number =>
  rows.reduce((acc, row) => acc + Number(row.amount ?? 0), 0);

const computeDeadlineState = (deadline?: string | null) => {
  if (!deadline) {
    return { daysRemaining: null, isOverdue: false };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Parse YYYY-MM-DD as local midnight; `new Date('YYYY-MM-DD')` parses as UTC
  // and shifts the day in negative-UTC timezones.
  const deadlineDate = new Date(deadline + 'T00:00:00');

  const diffMs = deadlineDate.getTime() - today.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

  return { daysRemaining: days, isOverdue: days < 0 };
}

const computePace = (
  current: number,
  target: number,
  startDate: Date,
  daysRemaining: number | null,
): {
  isOnTrack: boolean | null;
  pacePerDay: number | null;
  requiredPerDay: number | null;
} => {
  if (daysRemaining === null) {
    return { isOnTrack: null, pacePerDay: null, requiredPerDay: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysElapsed = Math.max(
    1,
    Math.round((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const pacePerDay = current / daysElapsed;
  const remaining = Math.max(0, target - current);
  let requiredPerDay = remaining;
  if (daysRemaining > 0) {
    requiredPerDay = remaining / daysRemaining;
  }
  const isOnTrack = pacePerDay >= requiredPerDay || current >= target;

  return { isOnTrack, pacePerDay, requiredPerDay };
}
