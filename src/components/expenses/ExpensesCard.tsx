import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import ReceiptViewer from '@/components/expenses/ReceiptViewer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import type { Expense } from '@/types/Expense';
import { formatCurrency } from '@/lib/utils.ts';

type ExpenseCardProps = {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  searchQuery?: string;
};

const ExpensesCard = ({
  expense,
  onEdit,
  onDelete,
  searchQuery,
}: ExpenseCardProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'el' ? el : enUS;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const blurActiveElement = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleDeleteClick = () => {
    blurActiveElement();
    setDropdownOpen(false);
    setTimeout(() => setShowDeleteDialog(true), 0);
  };

  const handleEditClick = () => {
    blurActiveElement();
    setDropdownOpen(false);
    setTimeout(() => onEdit(expense), 0);
  };

  const handleConfirmDelete = () => {
    onDelete(expense.id);
    setShowDeleteDialog(false);
  };

  const handleReceiptOpen = () => setShowReceipt(true);
  const handleReceiptClose = () => setShowReceipt(false);

  return (
    <>
      <Card className="rounded-2xl transition-colors hover:bg-accent/50 border-border/40 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex">
            {renderCategoryAccent(expense)}
            <div className="px-4 py-5 flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-base leading-tight truncate">
                      {renderHighlightedText(expense.description, searchQuery)}
                    </p>
                    {renderRecurringIcon(expense)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {format(new Date(expense.date), 'MMM d', {
                      locale: dateLocale,
                    })}
                    {renderCategoryLabel(expense)}
                    {renderTagLabel(expense)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <p className="text-lg font-semibold tabular-nums">
                    {formatCurrency(expense.amount)}
                  </p>

                  <DropdownMenu
                    open={dropdownOpen}
                    onOpenChange={setDropdownOpen}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">{t('common.openMenu')}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      {renderEditMenuItem(expense, t, handleEditClick)}
                      {renderReceiptMenuItem(expense, t, handleReceiptOpen)}
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
            <AlertDialogTitle>{t('expenses.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {renderDeleteDescription(expense, t)}
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

      {renderReceiptViewer(expense, showReceipt, handleReceiptClose)}
    </>
  );
};

export default memo(ExpensesCard);

// ─── Helper render functions ──────────────────────────────────────────────────

const renderCategoryAccent = (expense: Expense) => {
  if (!expense.category) return null;

  return (
    <div
      className="w-1.5 shrink-0 -m-px"
      style={{ backgroundColor: expense.category.color }}
    />
  );
};

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderHighlightedText = (text: string, query: string | undefined) => {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  const matchIndex = lower.indexOf(queryLower);
  if (matchIndex === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, matchIndex)}
      <mark className="bg-primary/20 text-foreground rounded-sm px-0.5">
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

const renderReceiptMenuItem = (
  expense: Expense,
  t: TranslateFunction,
  onClick: () => void,
) => {
  if (!expense.receipt_path) return null;

  return (
    <DropdownMenuItem onClick={onClick}>
      {t('receipt.receipt')}
    </DropdownMenuItem>
  );
};

const renderEditMenuItem = (
  expense: Expense,
  t: TranslateFunction,
  onClick: () => void,
) => {
  if (expense.recurring_expense_id) return null;

  return (
    <DropdownMenuItem onClick={onClick}>{t('common.edit')}</DropdownMenuItem>
  );
};

const renderDeleteDescription = (expense: Expense, t: TranslateFunction) => {
  const confirmation = t('expenses.deleteConfirmation');
  const actionUndone = t('common.actionUndone');

  if (expense.recurring_expense_id) {
    return `${confirmation}${t('expenses.deleteRecurringNote')}${actionUndone}`;
  }

  return `${confirmation}${actionUndone}`;
};

const renderReceiptViewer = (
  expense: Expense,
  isOpen: boolean,
  onClose: () => void,
) => {
  if (!expense.receipt_path) return null;

  return (
    <ReceiptViewer
      receiptPath={expense.receipt_path}
      open={isOpen}
      onClose={onClose}
    />
  );
};

