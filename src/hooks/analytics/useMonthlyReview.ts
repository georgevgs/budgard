import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useDateLocale } from '@/hooks/useDateLocale';
import { formatCurrency } from '@/lib/utils';
import type { MonthComparison } from '@/hooks/analytics/useAnalyticsData';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

export type MonthlyReviewItem = {
  id: 'comparison' | 'category' | 'budget' | 'count';
  text: string;
};

type Params = {
  expenses: Expense[];
  categories: Category[];
  comparison: MonthComparison;
  monthlyBudget: number | null;
  currency: string;
  now: Date;
};

export const useMonthlyReview = ({
  expenses,
  categories,
  comparison,
  monthlyBudget,
  currency,
  now,
}: Params) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  return useMemo(() => {
    const monthKey = format(now, 'yyyy-MM');
    const current = expenses.filter(
      (expense) => expense.date.slice(0, 7) === monthKey,
    );
    const items: MonthlyReviewItem[] = [
      buildComparison(comparison, currency, t),
    ];
    const category = findTopCategory(current, categories, t);
    if (category) {
      items.push({
        id: 'category',
        text: t('analytics.review.topCategory', {
          name: category.name,
          amount: formatCurrency(category.amount, currency),
        }),
      });
    }
    if (monthlyBudget !== null && monthlyBudget > 0) {
      items.push(
        buildBudget(comparison.thisMonthAmount, monthlyBudget, currency, t),
      );
    } else if (current.length > 0) {
      items.push({
        id: 'count',
        text: t('analytics.review.transactionCount', { count: current.length }),
      });
    }

    return {
      label: format(now, 'LLLL yyyy', { locale: dateLocale }),
      items: items.slice(0, 3),
    };
  }, [
    expenses,
    categories,
    comparison,
    monthlyBudget,
    currency,
    now,
    dateLocale,
    t,
  ]);
};

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const buildComparison = (
  comparison: MonthComparison,
  currency: string,
  t: TFunc,
): MonthlyReviewItem => {
  if (comparison.thisMonthAmount === 0) {
    return { id: 'comparison', text: t('analytics.review.noSpending') };
  }
  if (comparison.lastMonthAmount === 0) {
    return {
      id: 'comparison',
      text: t('analytics.review.firstMonth', {
        amount: formatCurrency(comparison.thisMonthAmount, currency),
      }),
    };
  }
  if (comparison.delta > 0) {
    return {
      id: 'comparison',
      text: t('analytics.review.moreThanLast', {
        amount: formatCurrency(comparison.delta, currency),
      }),
    };
  }
  if (comparison.delta < 0) {
    return {
      id: 'comparison',
      text: t('analytics.review.lessThanLast', {
        amount: formatCurrency(Math.abs(comparison.delta), currency),
      }),
    };
  }

  return { id: 'comparison', text: t('analytics.review.sameAsLast') };
};

const buildBudget = (
  spent: number,
  budget: number,
  currency: string,
  t: TFunc,
): MonthlyReviewItem => {
  const remaining = budget - spent;
  if (remaining >= 0) {
    return {
      id: 'budget',
      text: t('analytics.review.budgetLeft', {
        amount: formatCurrency(remaining, currency),
      }),
    };
  }

  return {
    id: 'budget',
    text: t('analytics.review.budgetOver', {
      amount: formatCurrency(Math.abs(remaining), currency),
    }),
  };
};

const findTopCategory = (
  expenses: Expense[],
  categories: Category[],
  t: TFunc,
): { name: string; amount: number } | null => {
  if (expenses.length === 0) {
    return null;
  }
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    const id = expense.category_id ?? 'uncategorized';
    totals.set(id, (totals.get(id) ?? 0) + expense.amount);
  }
  const [topId, amount] = [...totals.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0];
  const category = categories.find((candidate) => candidate.id === topId);
  let name = t('analytics.drillDown.uncategorized');
  if (category) {
    name = category.name;
  }

  return { name, amount };
};
