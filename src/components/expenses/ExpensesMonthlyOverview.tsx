import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { Expense } from '@/types/Expense';

type ExpensesMonthlyOverviewProps = {
  monthlyTotal: number;
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
    <div className="flex flex-col gap-4 bg-background border rounded-lg p-4">
      {/* Monthly Total */}
      <div
        onClick={hasExpenses ? onMonthlyTotalClick : undefined}
        className={cn(
          'group transition-all',
          hasExpenses && 'cursor-pointer hover:opacity-70',
        )}
      >
        <p className="text-sm font-medium text-muted-foreground">
          {t('expenses.monthlyTotal')}
        </p>
        <p className="text-2xl font-bold">{formatCurrency(monthlyTotal)}</p>
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
      </div>

      {/* Statistics */}
      {hasExpenses && (
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          {/* Number of Expenses */}
          <div>
            <p className="text-sm text-muted-foreground">
              {t('expenses.totalCount')}
            </p>
            <p className="text-lg font-semibold">{expenses.length}</p>
          </div>

          {/* Most Expensive */}
          {mostExpensive && (
            <div>
              <p className="text-sm text-muted-foreground">
                {t('expenses.mostExpensive')}
              </p>
              <p className="text-lg font-semibold">
                {formatCurrency(mostExpensive.amount)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {mostExpensive.description}
              </p>
            </div>
          )}
        </div>
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
