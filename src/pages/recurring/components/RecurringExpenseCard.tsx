import { SurfaceCard } from '@/common/components/common/SurfaceCard';
import { Switch } from '@/common/ui/switch';
import { Badge } from '@/common/ui/badge';
import Clock from 'lucide-react/dist/esm/icons/clock';
import { RecurringExpenseCardActions } from '@/pages/recurring/components/RecurringExpenseCardActions';
import { CategoryBadge } from '@/pages/recurring/components/CategoryBadge';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { cn, formatCurrency } from '@/constants/utils';
import { startOfToday } from '@/constants/dates';
import { useDataConfig } from '@/common/contexts/DataContext';
import { useDateLocale } from '@/common/hooks/useDateLocale';
import type { RecurringExpense } from '@/types/RecurringExpense';
import { useTranslation } from 'react-i18next';
import type { TranslateFunction } from '@/constants/translate';

type RecurringExpenseCardProps = {
  expense: RecurringExpense;
  nextOccurrence: Date | null;
  isOverdue: boolean;
  onEdit: (expense: RecurringExpense) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
};

export const RecurringExpenseCard = ({
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
  const isDueBadgeVisible = isOverdue && expense.active;

  return (
    <SurfaceCard
      className={cn(
        'transition-[opacity,background-color] hover:bg-muted/70',
        !expense.active && 'opacity-60 bg-muted/30',
      )}
    >
      <div className="p-4">
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
              <DueBadge
                isVisible={isDueBadgeVisible}
                isLate={isPastDue(nextOccurrence)}
              />
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
      </div>
    </SurfaceCard>
  );
};
const renderCategoryBadge = (expense: RecurringExpense) => {
  if (!expense.category) {
    return null;
  }

  return <CategoryBadge category={expense.category} />;
};

const DueBadge = ({
  isVisible,
  isLate,
}: {
  isVisible: boolean;
  isLate: boolean;
}) => {
  const { t } = useTranslation();

  if (isVisible) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
          getDueToneClassName(isLate),
        )}
      >
        {t('recurring.due')}
      </span>
    );
  } else {
    return null;
  }
};

const isPastDue = (nextOccurrence: Date | null): boolean =>
  null !== nextOccurrence && nextOccurrence < startOfToday();

const getDueToneClassName = (isLate: boolean): string => {
  if (isLate) {
    return 'bg-destructive/12 text-destructive-ink';
  } else {
    return 'bg-secondary text-secondary-foreground';
  }
};

const renderNextOccurrence = (
  expense: RecurringExpense,
  nextOccurrence: Date | null,
  dateLocale: Locale,
  t: TranslateFunction,
) => {
  if (!nextOccurrence || !expense.active) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>
        {t('recurring.next', {
          date: format(nextOccurrence, 'PP', { locale: dateLocale }),
        })}
      </span>
    </div>
  );
};
