import { useTranslation } from 'react-i18next';
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
import type { Expense } from '@/types/Expense';

type Props = {
  expense: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

const ExpenseDeleteDialog = ({
  expense,
  open,
  onOpenChange,
  onConfirm,
}: Props) => {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="sm:max-w-[425px]"
        onOpenChange={onOpenChange}
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
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ExpenseDeleteDialog;

// ─── Helper render functions ──────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderDeleteDescription = (expense: Expense, t: TranslateFunction) => {
  const confirmation = t('expenses.deleteConfirmation');
  const actionUndone = t('common.actionUndone');

  if (expense.recurring_expense_id) {
    return `${confirmation}${t('expenses.deleteRecurringNote')}${actionUndone}`;
  }

  return `${confirmation}${actionUndone}`;
};
