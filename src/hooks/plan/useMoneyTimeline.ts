import { useMemo } from 'react';
import { buildMoneyTimeline } from '@/lib/moneyTimeline';
import type { RecurringExpense } from '@/types/RecurringExpense';

type Input = {
  recurringExpenses: RecurringExpense[];
  recurringIncomes: RecurringExpense[];
  now: Date;
};

const TIMELINE_DAYS = 30;
const TIMELINE_LIMIT = 8;

export const useMoneyTimeline = ({
  recurringExpenses,
  recurringIncomes,
  now,
}: Input) => {
  return useMemo(
    () =>
      buildMoneyTimeline(recurringExpenses, recurringIncomes, now, {
        withinDays: TIMELINE_DAYS,
        limit: TIMELINE_LIMIT,
      }),
    [now, recurringExpenses, recurringIncomes],
  );
};
