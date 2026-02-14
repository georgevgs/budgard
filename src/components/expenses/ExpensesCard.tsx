import { useState } from 'react';
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
import { Camera, MoreVertical, Repeat } from 'lucide-react';
import ReceiptViewer from '@/components/expenses/ReceiptViewer';
import CategoryBadge from '@/components/categories/CategoryBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import type { Expense } from '@/types/Expense';
import { formatCurrency } from '@/lib/utils.ts';

type ExpenseCardProps = {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
};

const ExpensesCard = ({ expense, onEdit, onDelete }: ExpenseCardProps) => {
  const { t } = useTranslation();
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
    setTimeout(() => onEdit(), 0);
  };

  return (
    <>
      <Card className="rounded-lg transition-colors hover:bg-accent overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="font-medium text-base truncate max-w-[200px] sm:max-w-none">
                  {expense.description}
                </p>
                {expense.category && (
                  <CategoryBadge category={expense.category} />
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
                {format(new Date(expense.date), 'MMMM d, yyyy')}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <p className="text-lg font-semibold">
                {formatCurrency(expense.amount)}
              </p>

              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
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
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="sm:max-w-[425px]" onOpenChange={setShowDeleteDialog}>
          <AlertDialogHeader data-draggable-area>
            <AlertDialogTitle>{t('expenses.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('expenses.deleteConfirmation')}
              {expense.recurring_expense_id && t('expenses.deleteRecurringNote')}
              {t('common.actionUndone')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
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

export default ExpensesCard;
