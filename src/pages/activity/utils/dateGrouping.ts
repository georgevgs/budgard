import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { Expense } from '@/types/Expense';

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

type Locale = typeof enUS;

export type DateGroup = {
  label: string;
  date: string;
  expenses: Expense[];
};

export const getDateLabel = (
  dateString: string,
  dateLocale: Locale,
  t: TranslateFunction,
  showFullDate?: boolean,
): string => {
  const parsed = parseISO(dateString);

  if (!showFullDate) {
    if (isToday(parsed)) return t('dateGroup.today');
    if (isYesterday(parsed)) return t('dateGroup.yesterday');
  }

  return format(parsed, 'EEEE, MMM d', { locale: dateLocale });
};

export const groupExpensesByDate = (
  expenses: Expense[],
  dateLocale: Locale,
  t: TranslateFunction,
  showFullDate?: boolean,
): DateGroup[] => {
  const groups = new Map<string, Expense[]>();

  for (const expense of expenses) {
    const dateKey = expense.date;
    const existing = groups.get(dateKey);
    if (existing) {
      existing.push(expense);
    } else {
      groups.set(dateKey, [expense]);
    }
  }

  return Array.from(groups.entries()).map(([date, groupExpenses]) => ({
    label: getDateLabel(date, dateLocale, t, showFullDate),
    date,
    expenses: groupExpenses,
  }));
};
