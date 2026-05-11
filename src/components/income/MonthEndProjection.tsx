import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  format,
  parseISO,
  endOfMonth,
  startOfMonth,
  differenceInCalendarDays,
} from 'date-fns';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import {
  useExpensesData,
  useIncomesData,
  useRecurringData,
  useDataConfig,
} from '@/contexts/DataContext';
import { cn, formatCurrency } from '@/lib/utils';
import { getMonthlyAmount } from '@/lib/recurring';

type Props = {
  selectedMonth: string;
};

const MonthEndProjection = ({ selectedMonth }: Props) => {
  const { t } = useTranslation();
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const { recurringExpenses, recurringIncomes } = useRecurringData();
  const { defaultCurrency } = useDataConfig();

  const projection = useMemo(() => {
    const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
    const monthEnd = endOfMonth(monthStart);
    const daysInMonth = differenceInCalendarDays(monthEnd, monthStart) + 1;

    const today = new Date();
    const isCurrentMonth =
      format(today, 'yyyy-MM') === selectedMonth;
    const daysSoFar = isCurrentMonth
      ? Math.min(daysInMonth, differenceInCalendarDays(today, monthStart) + 1)
      : daysInMonth;
    const progress = daysSoFar / daysInMonth;

    const monthExpenses = expenses.filter(
      (e) => format(parseISO(e.date), 'yyyy-MM') === selectedMonth,
    );
    const monthIncomes = incomes.filter(
      (e) => format(parseISO(e.date), 'yyyy-MM') === selectedMonth,
    );

    const actualExpense = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const actualIncome = monthIncomes.reduce((s, e) => s + e.amount, 0);

    const recurringMonthlyExpense = recurringExpenses
      .filter((r) => r.active)
      .reduce((s, r) => s + getMonthlyAmount(r), 0);
    const recurringMonthlyIncome = recurringIncomes
      .filter((r) => r.active)
      .reduce((s, r) => s + getMonthlyAmount(r), 0);

    // Project based on actuals — simple straight line if we're at least 15% through
    const projectExpense = projectAmount(actualExpense, progress, recurringMonthlyExpense);
    const projectIncome = projectAmount(actualIncome, progress, recurringMonthlyIncome);

    return {
      projectedExpense: projectExpense,
      projectedIncome: projectIncome,
      projectedNet: projectIncome - projectExpense,
      progress,
      isCurrentMonth,
    };
  }, [
    expenses,
    incomes,
    recurringExpenses,
    recurringIncomes,
    selectedMonth,
  ]);

  // Don't render if no signal — no recurring set up AND nothing logged yet
  if (
    projection.projectedExpense === 0 &&
    projection.projectedIncome === 0
  ) {
    return null;
  }

  // Don't show projection for past months — already real, not projected
  if (!projection.isCurrentMonth) return null;

  const isPositive = projection.projectedNet >= 0;

  return (
    <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">{t('insights.projection.title')}</p>
      </div>

      <div className="space-y-2">
        <p
          className={cn(
            'text-3xl font-bold tracking-tight tabular-nums',
            isPositive ? 'text-income' : 'text-destructive',
          )}
        >
          {isPositive ? '+' : ''}
          {formatCurrency(projection.projectedNet, defaultCurrency)}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('insights.projection.subtitle', {
            income: formatCurrency(
              projection.projectedIncome,
              defaultCurrency,
            ),
            expense: formatCurrency(
              projection.projectedExpense,
              defaultCurrency,
            ),
          })}
        </p>
      </div>

      <p className="text-xs text-muted-foreground border-t border-border/40 pt-2">
        {t('insights.projection.note')}
      </p>
    </div>
  );
};

export default MonthEndProjection;

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Use recurring as the floor; extrapolate actuals only when we have meaningful signal.
// The extrapolation is a naive straight line — it assumes the user keeps spending
// at the same daily rate through month-end, which ignores weekends, paydays, and
// seasonal patterns. Wrap any UI that surfaces this number with a "current pace"
// caveat (see insights.projection.note).
export const projectAmount = (
  actual: number,
  progress: number,
  recurringMonthly: number,
): number => {
  if (progress < 0.15) {
    return Math.max(actual, recurringMonthly);
  }

  const linear = actual / progress;

  return Math.max(linear, recurringMonthly);
};
