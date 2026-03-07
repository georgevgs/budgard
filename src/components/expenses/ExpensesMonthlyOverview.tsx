import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { cn, formatCurrency } from '@/lib/utils';
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

  // Find most expensive expense
  const mostExpensive =
    expenses.length > 0
      ? expenses.reduce((prev, current) =>
          prev.amount > current.amount ? prev : current,
        )
      : null;

  return (
    <div className="flex flex-col gap-4 bg-card border border-border/40 rounded-2xl p-5 shadow-sm">
      {/* Monthly Total */}
      <button
        type="button"
        onClick={hasExpenses ? onMonthlyTotalClick : undefined}
        disabled={!hasExpenses}
        aria-expanded={hasExpenses ? isExpanded : undefined}
        className={cn(
          'w-full text-left transition-all',
          hasExpenses && 'cursor-pointer hover:opacity-70',
          !hasExpenses && 'cursor-default',
        )}
      >
        <p className="text-sm font-medium text-muted-foreground">
          {hasActiveFilters
            ? t('expenses.filteredTotal')
            : t('expenses.monthlyTotal')}
        </p>
        <p className="text-3xl font-bold tracking-tight">
          {formatCurrency(hasActiveFilters ? filteredTotal : monthlyTotal)}
        </p>
        {hasActiveFilters && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('expenses.ofMonthlyTotal', { total: formatCurrency(monthlyTotal) })}
          </p>
        )}
        {hasExpenses && (
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
            <ChevronDown
              className={cn(
                'h-3 w-3 transition-transform duration-200',
                isExpanded && 'rotate-180',
              )}
            />
            <span>
              {t(
                isExpanded
                  ? 'expenses.hideBreakdown'
                  : 'expenses.showBreakdown',
              )}
            </span>
          </div>
        )}
      </button>

      {/* Statistics */}
      {hasExpenses && (
        <dl className="grid grid-cols-2 gap-4 pt-2 border-t">
          {/* Number of Expenses */}
          <div>
            <dt className="text-sm text-muted-foreground">
              {t('expenses.totalCount')}
            </dt>
            <dd className="text-lg font-semibold">{expenses.length}</dd>
          </div>

          {/* Most Expensive */}
          {mostExpensive && (
            <div>
              <dt className="text-sm text-muted-foreground">
                {t('expenses.mostExpensive')}
              </dt>
              <dd className="text-lg font-semibold">
                {formatCurrency(mostExpensive.amount)}
              </dd>
              <dd className="text-xs text-muted-foreground truncate">
                {mostExpensive.description}
              </dd>
            </div>
          )}
        </dl>
      )}

      {/* Action Buttons */}
      {selectedMonth !== currentMonth && (
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
      )}
    </div>
  );
};

export default ExpensesMonthlyOverview;
