import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import Clock from 'lucide-react/dist/esm/icons/clock';
import RecurringExpenseCardActions from '@/components/recurring/RecurringExpenseCardActions';
import CategoryBadge from '@/components/categories/CategoryBadge';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import { useDataConfig } from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import type { RecurringExpense } from '@/types/RecurringExpense';
import { useTranslation } from 'react-i18next';

type RecurringExpenseCardProps = {
  expense: RecurringExpense;
  nextOccurrence: Date | null;
  isOverdue: boolean;
  onEdit: (expense: RecurringExpense) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
};

const RecurringExpenseCard = ({
  expense,
  nextOccurrence,
  isOverdue,
  onEdit,
  onDelete,
  onToggle,
}: RecurringExpenseCardProps) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const dateLocale = useDateLocale();

  return (
    <Card
      className={cn(
        'transition-opacity hover:shadow-md',
        !expense.active && 'opacity-60 bg-muted/30',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{expense.description}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {renderCategoryBadge(expense)}
              <Badge variant="secondary" className="text-xs">
                {t(`recurring.frequencies.${expense.frequency}`, {
                  defaultValue: expense.frequency,
                })}
              </Badge>
              {renderOverdueBadge(expense, isOverdue, t)}
            </div>
            <p className="text-base font-bold mt-1">
              {formatCurrency(expense.amount, defaultCurrency)}
            </p>
            {renderNextOccurrence(expense, nextOccurrence, dateLocale, t)}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={expense.active}
              onCheckedChange={(checked) => onToggle(expense.id, checked)}
              aria-label={t('recurring.toggleLabel', {
                description: expense.description,
              })}
            />
            <RecurringExpenseCardActions
              expense={expense}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecurringExpenseCard;

// ─── Helper render functions ──────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderCategoryBadge = (expense: RecurringExpense) => {
  if (!expense.category) return null;

  return <CategoryBadge category={expense.category} />;
};

const renderOverdueBadge = (
  expense: RecurringExpense,
  isOverdue: boolean,
  t: TranslateFunction,
) => {
  if (!isOverdue || !expense.active) return null;

  return (
    <Badge variant="destructive" className="text-xs">
      {t('recurring.due')}
    </Badge>
  );
};

const renderNextOccurrence = (
  expense: RecurringExpense,
  nextOccurrence: Date | null,
  dateLocale: Locale,
  t: TranslateFunction,
) => {
  if (!nextOccurrence || !expense.active) return null;

  return (
    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>
        {t('recurring.next', {
          date: format(nextOccurrence, 'MMM d, yyyy', { locale: dateLocale }),
        })}
      </span>
    </div>
  );
};
