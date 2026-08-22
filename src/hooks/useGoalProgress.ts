import { useMemo } from 'react';
import {
  useExpensesData,
  useIncomesData,
  useGoalsData,
} from '@/contexts/DataContext';
import { expenseHasTag } from '@/lib/expenseTags';
import { sumAmounts } from '@/lib/money';
import { countsInTotals } from '@/lib/spending';
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
    if (goals.length === 0) {
      return map;
    }

    // Single pass over each transaction array, bucketing amounts into every
    // goal at once — instead of re-filtering the full arrays per goal.
    const currents = sumCurrentsForGoals(goals, expenses, incomes);
    for (const goal of goals) {
      map[goal.id] = buildProgress(goal, currents.get(goal.id) ?? 0);
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
  const current = sumForSource(goal, expenses, incomes, goal.start_date);

  return buildProgress(goal, current);
}

const sumCurrentsForGoals = (
  goals: Goal[],
  expenses: Expense[],
  incomes: Expense[],
): Map<string, number> => {
  const currents = new Map<string, number>();
  // Index goals by how a row contributes to them so each transaction is
  // matched via map lookups instead of one full scan per goal.
  const goalsByCategory = new Map<string, Goal[]>();
  const goalsByTag = new Map<string, Goal[]>();
  const netDeltaGoals: Goal[] = [];

  for (const goal of goals) {
    currents.set(goal.id, 0);
    if (goal.source_type === 'category') {
      if (!goal.category_id) continue;
      appendToBucket(goalsByCategory, goal.category_id, goal);
    } else if (goal.source_type === 'tag') {
      if (!goal.tag_id) continue;
      appendToBucket(goalsByTag, goal.tag_id, goal);
    } else {
      netDeltaGoals.push(goal);
    }
  }

  for (const expense of expenses) {
    const amount = Number(expense.amount ?? 0);
    if (expense.category_id) {
      addToMatchingGoals(
        currents,
        goalsByCategory.get(expense.category_id),
        expense.date,
        amount,
      );
    }
    if (expense.tag_id) {
      addToMatchingGoals(
        currents,
        goalsByTag.get(expense.tag_id),
        expense.date,
        amount,
      );
    }
    addExtraTagAmounts(currents, goalsByTag, expense, amount);
    // net_delta counts every expense as an outflow.
    addToMatchingGoals(currents, netDeltaGoals, expense.date, -amount);
  }

  for (const income of incomes) {
    const amount = Number(income.amount ?? 0);
    addToMatchingGoals(currents, netDeltaGoals, income.date, amount);
  }

  return currents;
}

// Pro multi-tag: extras count toward tag goals too. An extra that duplicates
// the primary is skipped so the same expense can't be added to a goal twice.
const addExtraTagAmounts = (
  currents: Map<string, number>,
  goalsByTag: Map<string, Goal[]>,
  expense: Expense,
  amount: number,
): void => {
  if (!expense.extra_tags) return;

  for (const extraTag of expense.extra_tags) {
    if (extraTag.id === expense.tag_id) continue;
    addToMatchingGoals(
      currents,
      goalsByTag.get(extraTag.id),
      expense.date,
      amount,
    );
  }
}

const appendToBucket = (
  buckets: Map<string, Goal[]>,
  key: string,
  goal: Goal,
): void => {
  const existing = buckets.get(key);
  if (existing) {
    existing.push(goal);

    return;
  }

  buckets.set(key, [goal]);
}

// YYYY-MM-DD dates sort lexicographically, so string comparison is safe.
const addToMatchingGoals = (
  currents: Map<string, number>,
  goals: Goal[] | undefined,
  date: string,
  amount: number,
): void => {
  if (!goals) return;

  for (const goal of goals) {
    if (date < goal.start_date) continue;
    currents.set(goal.id, (currents.get(goal.id) ?? 0) + amount);
  }
}

const buildProgress = (goal: Goal, current: number): GoalProgress => {
  // Parse YYYY-MM-DD as local midnight; `new Date('YYYY-MM-DD')` parses as UTC
  // and shifts the day in negative-UTC timezones.
  const startDate = new Date(goal.start_date + 'T00:00:00');

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

    const goalTagId = goal.tag_id;

    return sumExpenses(
      expenses.filter(
        (e) => e.date >= startDate && expenseHasTag(e, goalTagId),
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

// Rows the user marked as not-spending are left out here for the same reason
// they are everywhere else: a transfer between their own accounts is not
// progress towards a goal, and for a net_delta goal it lands on both sides and
// distorts the figure in whichever direction the pair happens to fall.
const sumExpenses = (rows: Expense[]): number =>
  sumAmounts(
    rows.filter(countsInTotals).map((row) => Number(row.amount ?? 0)),
  );

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
