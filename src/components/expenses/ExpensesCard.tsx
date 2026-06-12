import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import ExpensesCardActions from '@/components/expenses/ExpensesCardActions';
import { format, parseISO } from 'date-fns';
import type { Expense } from '@/types/Expense';
import { formatCurrency, formatForeignAmount } from '@/lib/utils.ts';
import { useDataConfig } from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';

type ExpenseCardProps = {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onSaveAsTemplate?: (expense: Expense) => void;
  searchQuery?: string;
  showFullDate?: boolean;
};

const ExpensesCard = ({
  expense,
  onEdit,
  onDelete,
  onSaveAsTemplate,
  searchQuery,
  showFullDate,
}: ExpenseCardProps) => {
  const { defaultCurrency } = useDataConfig();
  const dateLocale = useDateLocale();

  return (
    <Card className="transition-colors hover:bg-accent/50 border-border/50 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex">
          {renderCategoryIndicator(expense)}
          <div className="px-4 py-4 flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-sm leading-tight truncate">
                    {renderHighlightedText(expense.description, searchQuery)}
                  </p>
                  {renderRecurringIcon(expense)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {format(
                    parseISO(expense.date),
                    resolveDateFormat(showFullDate),
                    { locale: dateLocale },
                  )}
                  {renderCategoryLabel(expense)}
                  {renderTagLabel(expense)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums tracking-tight">
                    {formatCurrency(expense.amount, defaultCurrency)}
                  </p>
                  {renderOriginalCurrency(expense)}
                </div>

                <ExpensesCardActions
                  expense={expense}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onSaveAsTemplate={onSaveAsTemplate}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(ExpensesCard);

// ─── Helper render functions ──────────────────────────────────────────────────

const resolveDateFormat = (showFullDate: boolean | undefined): string => {
  if (showFullDate) {
    return 'MMM d, yyyy';
  }

  return 'MMM d';
};

const renderCategoryIndicator = (expense: Expense) => {
  if (!expense.category) return null;

  if (expense.category.icon) {
    return (
      <div className="flex items-center pl-4 shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-base"
          style={{ backgroundColor: `${expense.category.color}20` }}
          aria-hidden="true"
        >
          {expense.category.icon}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-1.5 shrink-0 -m-px"
      style={{ backgroundColor: expense.category.color }}
      aria-hidden="true"
    />
  );
};

const renderHighlightedText = (text: string, query: string | undefined) => {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  const matchIndex = lower.indexOf(queryLower);
  if (matchIndex === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, matchIndex)}
      <mark className="bg-yellow-200 dark:bg-yellow-500/30 text-foreground rounded-sm px-0.5">
        {text.slice(matchIndex, matchIndex + query.length)}
      </mark>
      {text.slice(matchIndex + query.length)}
    </>
  );
};

const renderCategoryLabel = (expense: Expense) => {
  if (!expense.category) return null;

  return <> · {expense.category.name}</>;
};

const renderTagLabel = (expense: Expense) => {
  if (!expense.tag) return null;

  return <> · {expense.tag.name}</>;
};

const renderRecurringIcon = (expense: Expense) => {
  if (!expense.recurring_expense_id) return null;

  return <Repeat className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
};

const renderOriginalCurrency = (expense: Expense) => {
  if (!expense.original_currency || !expense.original_amount) return null;

  return (
    <p className="text-xs text-muted-foreground tabular-nums">
      {formatForeignAmount(expense.original_amount, expense.original_currency)}
    </p>
  );
};
