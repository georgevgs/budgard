import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import type { Locale } from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { useDataConfig } from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  monthKey: string;
  expenses: Expense[];
  categories: Category[];
};

export const MonthDrillDown = ({
  isOpen,
  onClose,
  monthKey,
  expenses,
  categories,
}: Props) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const dateLocale = useDateLocale();

  const monthExpenses = useMemo(
    () =>
      expenses.filter((e) => format(parseISO(e.date), 'yyyy-MM') === monthKey),
    [expenses, monthKey],
  );

  const totalAmount = useMemo(
    () => monthExpenses.reduce((sum, e) => sum + e.amount, 0),
    [monthExpenses],
  );

  const categoryBreakdown = useMemo(() => {
    const byCategory = new Map<string | null, number>();
    for (const expense of monthExpenses) {
      const key = expense.category_id ?? null;
      byCategory.set(key, (byCategory.get(key) ?? 0) + expense.amount);
    }

    return Array.from(byCategory.entries())
      .map(([categoryId, amount]) => {
        const category = categoryId
          ? categories.find((c) => c.id === categoryId)
          : null;

        return {
          id: categoryId ?? 'uncategorized',
          name: category?.name ?? t('analytics.drillDown.uncategorized'),
          color: category?.color ?? 'hsl(var(--muted-foreground))',
          amount,
          count: monthExpenses.filter(
            (e) => (e.category_id ?? null) === categoryId,
          ).length,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses, categories, t]);

  const monthLabel = monthKey
    ? format(parseISO(`${monthKey}-01`), 'LLLL yyyy', { locale: dateLocale })
    : '';

  const topExpenses = useMemo(
    () => [...monthExpenses].sort((a, b) => b.amount - a.amount).slice(0, 5),
    [monthExpenses],
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]" onOpenChange={onClose}>
        <DialogHeader className="px-6 pt-6" data-draggable-area>
          <DialogTitle className="capitalize">{monthLabel}</DialogTitle>
          <DialogDescription>
            {t('analytics.drillDown.monthTotal', {
              amount: formatCurrency(totalAmount, defaultCurrency),
              count: monthExpenses.length,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] px-6 pb-6">
          {renderCategoryBreakdown(categoryBreakdown, totalAmount, t, defaultCurrency)}
          {renderTopExpenses(topExpenses, dateLocale, t, defaultCurrency)}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Helper render functions ──────────────────────────────────────────────────

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderCategoryBreakdown = (
  breakdown: {
    id: string;
    name: string;
    color: string;
    amount: number;
    count: number;
  }[],
  totalAmount: number,
  t: TFunc,
  currency: string,
) => {
  if (breakdown.length === 0) return null;

  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
        {t('analytics.drillDown.byCategory')}
      </p>
      <div className="space-y-2">
        {breakdown.map((cat) => {
          const pct = totalAmount > 0 ? (cat.amount / totalAmount) * 100 : 0;

          return (
            <div key={cat.id} className="flex items-center gap-3">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-sm flex-1 truncate">{cat.name}</span>
              <span className="text-sm font-semibold tabular-nums shrink-0">
                {formatCurrency(cat.amount, currency)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0">
                {Math.round(pct)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const renderTopExpenses = (
  expenses: Expense[],
  dateLocale: Locale,
  t: TFunc,
  currency: string,
) => {
  if (expenses.length === 0) return null;

  return (
    <div className="mt-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
        {t('analytics.drillDown.topExpenses')}
      </p>
      <div className="space-y-1">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {renderCategoryDot(expense)}
                <p className="text-sm font-medium truncate">
                  {expense.description}
                </p>
              </div>
              <p className="text-xs text-muted-foreground ml-4">
                {format(parseISO(expense.date), 'MMM d', {
                  locale: dateLocale,
                })}
                {renderCategoryName(expense)}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums shrink-0 ml-3">
              {formatCurrency(expense.amount, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const renderCategoryDot = (expense: Expense) => {
  if (!expense.category) return null;

  return (
    <div
      className="w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: expense.category.color }}
    />
  );
};

const renderCategoryName = (expense: Expense) => {
  if (!expense.category) return null;

  return <> · {expense.category.name}</>;
};
