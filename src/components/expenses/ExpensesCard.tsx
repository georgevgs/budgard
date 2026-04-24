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
import Bookmark from 'lucide-react/dist/esm/icons/bookmark';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Receipt from 'lucide-react/dist/esm/icons/receipt';
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import ReceiptViewer from '@/components/expenses/ReceiptViewer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, parseISO } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import type { Expense } from '@/types/Expense';
import { formatCurrency, formatForeignAmount } from '@/lib/utils.ts';
import { useData } from '@/contexts/DataContext';

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
  const { t, i18n } = useTranslation();
  const { defaultCurrency } = useData();
  const dateLocale = i18n.language === 'el' ? el : enUS;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const blurActiveElement = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleDeleteClick = () => {
    blurActiveElement();
    setMenuOpen(false);
    setTimeout(() => setShowDeleteDialog(true), 0);
  };

  const handleEditClick = () => {
    blurActiveElement();
    setMenuOpen(false);
    setTimeout(() => onEdit(expense), 0);
  };

  const handleConfirmDelete = () => {
    onDelete(expense.id);
    setShowDeleteDialog(false);
  };

  const handleSaveAsTemplate = () => {
    blurActiveElement();
    setMenuOpen(false);
    if (onSaveAsTemplate) {
      setTimeout(() => onSaveAsTemplate(expense), 0);
    }
  };

  const handleReceiptOpen = () => setShowReceipt(true);
  const handleReceiptClose = () => setShowReceipt(false);

  return (
    <>
      <Card className="rounded-2xl transition-colors hover:bg-accent/50 border-border/50 overflow-hidden">
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
                      showFullDate ? 'MMM d, yyyy' : 'MMM d',
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

                  <DropdownMenu
                    open={menuOpen}
                    onOpenChange={setMenuOpen}
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
                    <DropdownMenuContent align="end">
                      {renderEditMenuItem(expense, t, handleEditClick)}
                      {renderTemplateMenuItem(onSaveAsTemplate, t, handleSaveAsTemplate)}
                      {renderReceiptMenuItem(expense, t, handleReceiptOpen)}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleDeleteClick}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
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

const renderEditMenuItem = (
  expense: Expense,
  t: TranslateFunction,
  onClick: () => void,
) => {
  if (expense.recurring_expense_id) return null;

  return (
    <DropdownMenuItem onClick={onClick}>
      <Pencil className="h-4 w-4" />
      {t('common.edit')}
    </DropdownMenuItem>
  );
};

const renderTemplateMenuItem = (
  onSaveAsTemplate: ((expense: Expense) => void) | undefined,
  t: TranslateFunction,
  onClick: () => void,
) => {
  if (!onSaveAsTemplate) return null;

  return (
    <DropdownMenuItem onClick={onClick}>
      <Bookmark className="h-4 w-4" />
      {t('templates.saveAsTemplate')}
    </DropdownMenuItem>
  );
};

const renderReceiptMenuItem = (
  expense: Expense,
  t: TranslateFunction,
  onClick: () => void,
) => {
  if (!expense.receipt_path) return null;

  return (
    <DropdownMenuItem onClick={onClick}>
      <Receipt className="h-4 w-4" />
      {t('receipt.receipt')}
    </DropdownMenuItem>
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

const renderOriginalCurrency = (expense: Expense) => {
  if (!expense.original_currency || !expense.original_amount) return null;

  return (
    <p className="text-xs text-muted-foreground tabular-nums">
      {formatForeignAmount(expense.original_amount, expense.original_currency)}
    </p>
  );
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
