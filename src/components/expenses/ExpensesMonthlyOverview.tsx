import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { cn, formatCurrency } from '@/lib/utils';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useDataConfig } from '@/contexts/DataContext';
import type { Expense } from '@/types/Expense';

type ExpensesMonthlyOverviewProps = {
  monthlyTotal: number;
  filteredTotal: number;
  hasActiveFilters: boolean;
  selectedMonth: string;
  currentMonth: string;
  isExpanded?: boolean;
  hasExpenses: boolean;
  expenses: Expense[];
  onCurrentMonthClick: () => void;
  onMonthlyTotalClick: () => void;
};

const ExpensesMonthlyOverview = ({
  monthlyTotal,
  filteredTotal,
  hasActiveFilters,
  selectedMonth,
  currentMonth,
  isExpanded = false,
  hasExpenses,
  expenses,
  onCurrentMonthClick,
  onMonthlyTotalClick,
}: ExpensesMonthlyOverviewProps) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();

  const displayTotal = pickDisplayTotal(hasActiveFilters, filteredTotal, monthlyTotal);
  const animatedTotal = useAnimatedNumber(displayTotal);
  const mostExpensive = findMostExpensive(expenses);
  const totalLabel = getTotalLabel(hasActiveFilters, t);

  return (
    <div className="flex flex-col gap-4 bg-card border border-border/40 rounded-2xl p-5 shadow-sm">
      <button
        type="button"
        onClick={onMonthlyTotalClick}
        disabled={!hasExpenses}
        aria-expanded={getAriaExpanded(hasExpenses, isExpanded)}
        className={cn(
          'w-full text-left transition-all rounded-lg',
          hasExpenses && 'cursor-pointer hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          !hasExpenses && 'cursor-default',
        )}
      >
        <p className="text-sm font-medium text-muted-foreground">
          {totalLabel}
        </p>
        <p className="text-3xl font-bold tracking-tight tabular-nums">
          {formatCurrency(animatedTotal, defaultCurrency)}
        </p>
        {renderFilteredSubtotalNote(hasActiveFilters, monthlyTotal, t, defaultCurrency)}
        {renderExpandHint(hasExpenses, isExpanded, t)}
      </button>

      {renderStats(hasExpenses, expenses, mostExpensive, t, defaultCurrency)}

      {renderCurrentMonthButton(selectedMonth, currentMonth, onCurrentMonthClick, t)}
    </div>
  );
};

export default ExpensesMonthlyOverview;

// ─── Helper render functions ──────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const pickDisplayTotal = (
  hasActiveFilters: boolean,
  filteredTotal: number,
  monthlyTotal: number,
): number => {
  if (hasActiveFilters) return filteredTotal;

  return monthlyTotal;
};

const findMostExpensive = (expenses: Expense[]): Expense | null => {
  if (expenses.length === 0) return null;

  return expenses.reduce((prev, current) => {
    if (prev.amount > current.amount) return prev;

    return current;
  });
};

const getTotalLabel = (hasActiveFilters: boolean, t: TranslateFunction) => {
  if (hasActiveFilters) return t('expenses.filteredTotal');

  return t('expenses.monthlyTotal');
};

const getAriaExpanded = (hasExpenses: boolean, isExpanded: boolean) => {
  if (!hasExpenses) return undefined;

  return isExpanded;
};

const renderFilteredSubtotalNote = (
  hasActiveFilters: boolean,
  monthlyTotal: number,
  t: TranslateFunction,
  currency: string,
) => {
  if (!hasActiveFilters) return null;

  return (
    <p className="text-xs text-muted-foreground mt-0.5">
      {t('expenses.ofMonthlyTotal', {
        total: formatCurrency(monthlyTotal, currency),
      })}
    </p>
  );
};

const renderExpandHint = (
  hasExpenses: boolean,
  isExpanded: boolean,
  t: TranslateFunction,
) => {
  if (!hasExpenses) return null;

  const breakdownLabel = getBreakdownLabel(isExpanded, t);

  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
      <ChevronDown
        className={cn(
          'h-3 w-3 transition-transform duration-200',
          isExpanded && 'rotate-180',
        )}
      />
      <span>{breakdownLabel}</span>
    </div>
  );
};

const getBreakdownLabel = (isExpanded: boolean, t: TranslateFunction) => {
  if (isExpanded) return t('expenses.hideBreakdown');

  return t('expenses.showBreakdown');
};

const renderMostExpensive = (
  mostExpensive: Expense | null,
  t: TranslateFunction,
  currency: string,
) => {
  if (!mostExpensive) return null;

  return (
    <div>
      <dt className="text-sm text-muted-foreground">
        {t('expenses.mostExpensive')}
      </dt>
      <dd className="text-lg font-semibold">
        {formatCurrency(mostExpensive.amount, currency)}
      </dd>
      <dd className="text-xs text-muted-foreground truncate">
        {mostExpensive.description}
      </dd>
    </div>
  );
};

const renderStats = (
  hasExpenses: boolean,
  expenses: Expense[],
  mostExpensive: Expense | null,
  t: TranslateFunction,
  currency: string,
) => {
  if (!hasExpenses) return null;

  return (
    <dl className="grid grid-cols-2 gap-4 pt-2 border-t">
      {/* Number of Expenses */}
      <div>
        <dt className="text-sm text-muted-foreground">
          {t('expenses.totalCount')}
        </dt>
        <dd className="text-lg font-semibold">{expenses.length}</dd>
      </div>

      {/* Most Expensive */}
      {renderMostExpensive(mostExpensive, t, currency)}
    </dl>
  );
};

const renderCurrentMonthButton = (
  selectedMonth: string,
  currentMonth: string,
  onCurrentMonthClick: () => void,
  t: TranslateFunction,
) => {
  if (selectedMonth === currentMonth) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={onCurrentMonthClick}
        className="text-muted-foreground"
      >
        <CalendarDays className="h-4 w-4 mr-2" />
        {t('navigation.today')}
      </Button>
    </div>
  );
};
