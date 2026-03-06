import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import Clock from 'lucide-react/dist/esm/icons/clock';
import CategoryBadge from '@/components/categories/CategoryBadge';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { cn, formatCurrency } from '@/lib/utils';
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'el' ? el : enUS;

  const blurActiveElement = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleEditClick = () => {
    blurActiveElement();
    setDropdownOpen(false);
    setTimeout(() => onEdit(expense), 0);
  };

  const handleDeleteClick = () => {
    blurActiveElement();
    setDropdownOpen(false);
    setTimeout(() => setShowDeleteDialog(true), 0);
  };

  const handleConfirmDelete = () => {
    onDelete(expense.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card
        className={cn(
          'transition-opacity',
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
                {formatCurrency(expense.amount)}
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
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">{t('common.openMenu')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem onClick={handleEditClick}>
                    {t('common.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDeleteClick}
                    className="text-destructive focus:text-destructive"
                  >
                    {t('common.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent
          className="sm:max-w-[425px]"
          onOpenChange={setShowDeleteDialog}
        >
          <AlertDialogHeader data-draggable-area>
            <AlertDialogTitle>{t('recurring.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('recurring.deleteConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
