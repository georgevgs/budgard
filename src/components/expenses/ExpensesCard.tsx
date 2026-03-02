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
import Camera from 'lucide-react/dist/esm/icons/camera';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import TagIcon from 'lucide-react/dist/esm/icons/tag';
import ReceiptViewer from '@/components/expenses/ReceiptViewer';
import CategoryBadge from '@/components/categories/CategoryBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import type { Expense } from '@/types/Expense';
import type { Tag } from '@/types/Tag';
import { formatCurrency } from '@/lib/utils.ts';

type ExpenseCardProps = {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  searchQuery?: string;
};

const ExpensesCard = ({ expense, onEdit, onDelete, searchQuery }: ExpenseCardProps) => {
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

  return (
    <>
      <Card className="rounded-lg transition-colors hover:bg-accent overflow-hidden border-border/60">
        <CardContent className="p-0">
          <div className="flex">
            {renderCategoryAccent(expense)}
            <div className="p-4 flex-1 min-w-0">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-medium text-base truncate max-w-[200px] sm:max-w-none">
                      {renderHighlightedText(expense.description, searchQuery)}
                    </p>
                    {expense.category && (
                      <CategoryBadge category={expense.category} />
                    )}
                    {expense.tag && (
                      <TagBadge tag={expense.tag} />
                    )}
                    {expense.recurring_expense_id && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Repeat className="h-3 w-3" />
                        <span>{t('expenses.recurring')}</span>
                      </div>
                    )}
                    {expense.receipt_path && (
                      <button
                        type="button"
                        onClick={() => setShowReceipt(true)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Camera className="h-3 w-3" />
                        <span>{t('receipt.receipt')}</span>
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(expense.date), 'MMMM d, yyyy', { locale: dateLocale })}
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                  <p className="text-lg font-bold tabular-nums">
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
                      {!expense.recurring_expense_id && (
                        <DropdownMenuItem onClick={handleEditClick}>
                          {t('common.edit')}
                        </DropdownMenuItem>
                      )}
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
              {t('expenses.deleteConfirmation')}
              {expense.recurring_expense_id &&
                t('expenses.deleteRecurringNote')}
              {t('common.actionUndone')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(expense.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {expense.receipt_path && (
        <ReceiptViewer
          receiptPath={expense.receipt_path}
          open={showReceipt}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </>
  );
};

function renderHighlightedText(text: string, query: string | undefined) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  const idx = lower.indexOf(queryLower);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-foreground rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

const renderCategoryAccent = (expense: Expense) => {
  if (!expense.category) return null;
  return (
    <div
      className="w-1 shrink-0"
      style={{ backgroundColor: expense.category.color }}
    />
  );
};

const TagBadge = ({ tag }: { tag: Tag }) => {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
      }}
    >
      <TagIcon className="h-3 w-3" />
      {tag.name}
    </div>
  );
};

export default memo(ExpensesCard);
