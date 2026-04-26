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
import { useData } from '@/contexts/DataContext';
import { cn, formatCurrency } from '@/lib/utils';
import type { RecurringExpense } from '@/types/RecurringExpense';

type Props = {
  selectedMonth: string;
};

const WEEKS_PER_MONTH = 4.33;
const BIWEEKLY_PERIODS_PER_MONTH = 2.17;

const MonthEndProjection = ({ selectedMonth }: Props) => {
  const { t } = useTranslation();
  const {
    expenses,
    incomes,
    recurringExpenses,
    recurringIncomes,
    defaultCurrency,
  } = useData();

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
      .reduce((s, r) => s + monthlyEquivalent(r), 0);
    const recurringMonthlyIncome = recurringIncomes
      .filter((r) => r.active)
      .reduce((s, r) => s + monthlyEquivalent(r), 0);

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

const monthlyEquivalent = (r: RecurringExpense): number => {
  switch (r.frequency) {
    case 'weekly':
      return r.amount * WEEKS_PER_MONTH;
    case 'biweekly':
      return r.amount * BIWEEKLY_PERIODS_PER_MONTH;
    case 'quarterly':
      return r.amount / 3;
    case 'yearly':
      return r.amount / 12;
    default:
      return r.amount;
  }
};

// Use recurring as the floor; extrapolate actuals only when we have meaningful signal.
const projectAmount = (
  actual: number,
  progress: number,
  recurringMonthly: number,
): number => {
  if (progress < 0.15) {
    // Too early to extrapolate — just show recurring baseline + whatever's logged
    return Math.max(actual, recurringMonthly);
  }

  // Straight line projection of actuals + recurring floor
  const linear = actual / progress;

  return Math.max(linear, recurringMonthly);
};
