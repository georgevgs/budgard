import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import PiggyBank from 'lucide-react/dist/esm/icons/piggy-bank';
import IncomeCardActions from '@/components/income/IncomeCardActions';
import { format, parseISO } from 'date-fns';
import type { Expense } from '@/types/Expense';
import { formatCurrency, formatForeignAmount } from '@/lib/utils';
import { useDataConfig } from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';

type IncomeCardProps = {
  income: Expense;
  onEdit: (income: Expense) => void;
  onDelete: (id: string) => void;
  showFullDate?: boolean;
};

const IncomeCard = ({
  income,
  onEdit,
  onDelete,
  showFullDate,
}: IncomeCardProps) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const dateLocale = useDateLocale();

  return (
    <Card className="transition-colors hover:bg-accent/50 border-border/50 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex">
          {renderCategoryIndicator(income)}
          <div className="px-4 py-4 flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-sm leading-tight truncate">
                    {income.description}
                  </p>
                  {renderRecurringIcon(income)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {format(
                    parseISO(income.date),
                    resolveDateFormat(showFullDate),
                    { locale: dateLocale },
                  )}
                  {renderCategoryLabel(income)}
                </p>
                {renderSavingsBadge(income, defaultCurrency, t)}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums tracking-tight text-income">
                    +{formatCurrency(income.amount, defaultCurrency)}
                  </p>
                  {renderOriginalCurrency(income)}
                </div>

                <IncomeCardActions
                  income={income}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(IncomeCard);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const resolveDateFormat = (showFullDate: boolean | undefined): string => {
  if (showFullDate) {
    return 'MMM d, yyyy';
  }

  return 'MMM d';
};

const renderCategoryIndicator = (income: Expense) => {
  if (!income.category) return null;

  if (income.category.icon) {
    return (
      <div className="flex items-center pl-4 shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-base"
          style={{ backgroundColor: `${income.category.color}20` }}
          aria-hidden="true"
        >
          {income.category.icon}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-1.5 shrink-0 -m-px"
      style={{ backgroundColor: income.category.color }}
      aria-hidden="true"
    />
  );
};

const renderCategoryLabel = (income: Expense) => {
  if (!income.category) return null;

  return <> · {income.category.name}</>;
};

const renderRecurringIcon = (income: Expense) => {
  if (!income.recurring_expense_id) return null;

  return <Repeat className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
};

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderSavingsBadge = (
  income: Expense,
  currency: string,
  t: TranslateFunction,
) => {
  const allocation = income.savings_allocation_amount;
  if (!allocation || allocation <= 0) return null;

  return (
    <div className="inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 rounded-full bg-income/10 text-income">
      <PiggyBank className="h-3 w-3" />
      {t('income.savedBadge', {
        amount: formatCurrency(allocation, currency),
      })}
    </div>
  );
};

const renderOriginalCurrency = (income: Expense) => {
  if (!income.original_currency || !income.original_amount) return null;

  return (
    <p className="text-xs text-muted-foreground tabular-nums">
      {formatForeignAmount(income.original_amount, income.original_currency)}
    </p>
  );
};
