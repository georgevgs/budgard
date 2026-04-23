import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { useData } from '@/contexts/DataContext';
import type { Expense } from '@/types/Expense';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  categoryColor: string;
  expenses: Expense[];
  totalAmount: number;
};

export const CategoryDrillDown = ({
  isOpen,
  onClose,
  categoryName,
  categoryColor,
  expenses,
  totalAmount,
}: Props) => {
  const { t, i18n } = useTranslation();
  const { defaultCurrency } = useData();
  const dateLocale = i18n.language === 'el' ? el : enUS;

  const sortedExpenses = useMemo(
    () =>
      [...expenses].sort(
        (a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime(),
      ),
    [expenses],
  );

  const monthlyBreakdown = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const expense of expenses) {
      const key = format(parseISO(expense.date), 'yyyy-MM');
      byMonth.set(key, (byMonth.get(key) ?? 0) + expense.amount);
    }

    return Array.from(byMonth.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, amount]) => ({
        label: format(parseISO(`${key}-01`), 'LLLL', { locale: dateLocale }),
        amount,
      }));
  }, [expenses, dateLocale]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]" onOpenChange={onClose}>
        <DialogHeader className="px-6 pt-6" data-draggable-area>
          <div className="flex items-center gap-2.5">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: categoryColor }}
            />
            <DialogTitle>{categoryName}</DialogTitle>
          </div>
          <DialogDescription>
            {t('analytics.drillDown.categoryTotal', {
              amount: formatCurrency(totalAmount, defaultCurrency),
              count: expenses.length,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] px-6 pb-6">
          {renderMonthlyBreakdown(monthlyBreakdown, categoryColor, t, defaultCurrency)}

          <p className="text-xs text-muted-foreground uppercase tracking-wide mt-5 mb-2">
            {t('analytics.drillDown.allExpenses')}
          </p>
          <div className="space-y-1">
            {sortedExpenses.map((expense) =>
              renderExpenseRow(expense, dateLocale, defaultCurrency),
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Helper render functions ──────────────────────────────────────────────────

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderMonthlyBreakdown = (
  months: { label: string; amount: number }[],
  color: string,
  t: TFunc,
  currency: string,
) => {
  if (months.length <= 1) return null;

  const max = Math.max(...months.map((m) => m.amount));

  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
        {t('analytics.drillDown.monthlyTrend')}
      </p>
      <div className="space-y-1.5">
        {months.map((month) => {
          const width = max > 0 ? (month.amount / max) * 100 : 0;

          return (
            <div key={month.label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0 capitalize">
                {month.label}
              </span>
              <div className="flex-1 h-4 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${width}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-xs font-medium tabular-nums w-20 text-right shrink-0">
                {formatCurrency(month.amount, currency)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const renderExpenseRow = (expense: Expense, dateLocale: Locale, currency: string) => {
  return (
    <div
      key={expense.id}
      className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{expense.description}</p>
        <p className="text-xs text-muted-foreground">
          {format(parseISO(expense.date), 'MMM d, yyyy', {
            locale: dateLocale,
          })}
          {renderTagInRow(expense)}
        </p>
      </div>
      <span className="text-sm font-semibold tabular-nums shrink-0 ml-3">
        {formatCurrency(expense.amount, currency)}
      </span>
    </div>
  );
};

const renderTagInRow = (expense: Expense) => {
  if (!expense.tag) return null;

  return <> · {expense.tag.name}</>;
};

type Locale = typeof enUS;
