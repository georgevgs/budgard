import { useMemo } from 'react';
import {
  TIMELINE_DAYS,
  buildMoneyTimeline,
  type TimelineRange,
} from '@/pages/plan/utils/moneyTimeline';
import type { RecurringExpense } from '@/types/RecurringExpense';

type Input = {
  recurringExpenses: RecurringExpense[];
  recurringIncomes: RecurringExpense[];
  range: TimelineRange;
  now: Date;
};

const TIMELINE_LIMIT = 8;

export const useMoneyTimeline = ({
  recurringExpenses,
  recurringIncomes,
  range,
  now,
}: Input) => {
  return useMemo(() => {
    const timeline = buildMoneyTimeline(
      recurringExpenses,
      recurringIncomes,
      now,
      { range, withinDays: TIMELINE_DAYS, limit: TIMELINE_LIMIT },
    );

    // An empty window means two different things and deserves two different
    // empty states: nothing is scheduled at all, or nothing is scheduled in
    // the window the reader happens to be looking at.
    const hasSchedules = [...recurringExpenses, ...recurringIncomes].some(
      (item) => item.active,
    );

    return { timeline, hasSchedules };
  }, [now, range, recurringExpenses, recurringIncomes]);
};
