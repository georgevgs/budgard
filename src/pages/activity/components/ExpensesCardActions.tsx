import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/common/ui/button';
import { ScrollSafeDropdownMenuTrigger } from '@/common/components/common/ScrollSafeDropdownMenuTrigger';
import type { TranslateFunction } from '@/constants/translate';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/common/ui/dropdown-menu';
import Bookmark from 'lucide-react/dist/esm/icons/bookmark';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Receipt from 'lucide-react/dist/esm/icons/receipt';
import Split from 'lucide-react/dist/esm/icons/split';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Undo2 from 'lucide-react/dist/esm/icons/undo-2';
import { ExpenseDeleteDialog } from '@/pages/activity/components/ExpenseDeleteDialog';
import { ReceiptViewer } from '@/pages/activity/components/ReceiptViewer';
import { SplitExpenseDialog } from '@/pages/activity/components/SplitExpenseDialog';
import { RefundExpenseDialog } from '@/pages/activity/components/RefundExpenseDialog';
import type { Expense } from '@/types/Expense';

type ExpensesCardActionsProps = {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onSaveAsTemplate?: (expense: Expense) => void;
};

export const ExpensesCardActions = ({
  expense,
  onEdit,
  onDelete,
  onSaveAsTemplate,
}: ExpensesCardActionsProps) => {
  const { t } = useTranslation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReceiptVisible, setIsReceiptVisible] = useState(false);
  const [isSplitVisible, setIsSplitVisible] = useState(false);
  const [isRefundVisible, setIsRefundVisible] = useState(false);

  const handleDeleteClick = () => {
    blurActiveElement();
    setIsMenuOpen(false);
    setTimeout(() => setIsDeleteDialogOpen(true), 0);
  };

  const handleSplitClick = () => {
    blurActiveElement();
    setIsMenuOpen(false);
    setTimeout(() => setIsSplitVisible(true), 0);
  };

  const handleRefundClick = () => {
    blurActiveElement();
    setIsMenuOpen(false);
    setTimeout(() => setIsRefundVisible(true), 0);
  };

  const handleEditClick = () => {
    blurActiveElement();
    setIsMenuOpen(false);
    setTimeout(() => onEdit(expense), 0);
  };

  const handleConfirmDelete = () => {
    onDelete(expense.id);
    setIsDeleteDialogOpen(false);
  };

  const handleSaveAsTemplate = () => {
    blurActiveElement();
    setIsMenuOpen(false);
    if (onSaveAsTemplate) {
      setTimeout(() => onSaveAsTemplate(expense), 0);
    }
  };

  return (
    <>
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <ScrollSafeDropdownMenuTrigger
          asChild
          isOpen={isMenuOpen}
          onOpenChange={setIsMenuOpen}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">{t('common.openMenu')}</span>
          </Button>
        </ScrollSafeDropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {renderEditMenuItem(expense, t, handleEditClick)}
          {renderTemplateMenuItem(onSaveAsTemplate, t, handleSaveAsTemplate)}
          {renderSplitMenuItem(expense, t, handleSplitClick)}
          {renderRefundMenuItem(expense, t, handleRefundClick)}
          {renderReceiptMenuItem(expense, t, () => setIsReceiptVisible(true))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDeleteClick}
            className="text-destructive-ink focus:text-destructive-ink"
          >
            <Trash2 className="h-4 w-4" />
            {t('common.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExpenseDeleteDialog
        expense={expense}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
      />

      {renderReceiptViewer(expense, isReceiptVisible, () => setIsReceiptVisible(false))}
      {renderSplitDialog(expense, isSplitVisible, setIsSplitVisible)}
      {renderRefundDialog(expense, isRefundVisible, setIsRefundVisible)}
    </>
  );
};
const blurActiveElement = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

const renderEditMenuItem = (
  expense: Expense,
  t: TranslateFunction,
  onClick: () => void,
) => {
  if (expense.recurring_expense_id) {
    return null;
  }

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
  if (!onSaveAsTemplate) {
    return null;
  }

  return (
    <DropdownMenuItem onClick={onClick}>
      <Bookmark className="h-4 w-4" />
      {t('templates.saveAsTemplate')}
    </DropdownMenuItem>
  );
};

// Splitting rewrites the amount, so it follows the same rules as editing:
// not for debt payments, recurring-generated rows, or refunds.
const canSplit = (expense: Expense): boolean => {
  if (expense.type === 'debt_payment' || expense.debt_id) {
    return false;
  }
  if (expense.recurring_expense_id) {
    return false;
  }

  return expense.amount > 0;
};

const canRefund = (expense: Expense): boolean => {
  if (expense.type === 'debt_payment' || expense.debt_id) {
    return false;
  }

  return expense.amount > 0;
};

const renderSplitMenuItem = (
  expense: Expense,
  t: TranslateFunction,
  onClick: () => void,
) => {
  if (!canSplit(expense)) {
    return null;
  }

  return (
    <DropdownMenuItem onClick={onClick}>
      <Split className="h-4 w-4" />
      {t('expenses.split.action')}
    </DropdownMenuItem>
  );
};

const renderRefundMenuItem = (
  expense: Expense,
  t: TranslateFunction,
  onClick: () => void,
) => {
  if (!canRefund(expense)) {
    return null;
  }

  return (
    <DropdownMenuItem onClick={onClick}>
      <Undo2 className="h-4 w-4" />
      {t('expenses.refund.action')}
    </DropdownMenuItem>
  );
};

const renderSplitDialog = (
  expense: Expense,
  isOpen: boolean,
  setOpen: (open: boolean) => void,
) => {
  if (!isOpen) {
    return null;
  }

  return (
    <SplitExpenseDialog
      expense={expense}
      open={isOpen}
      onOpenChange={setOpen}
    />
  );
};

const renderRefundDialog = (
  expense: Expense,
  isOpen: boolean,
  setOpen: (open: boolean) => void,
) => {
  if (!isOpen) {
    return null;
  }

  return (
    <RefundExpenseDialog
      expense={expense}
      open={isOpen}
      onOpenChange={setOpen}
    />
  );
};

const renderReceiptMenuItem = (
  expense: Expense,
  t: TranslateFunction,
  onClick: () => void,
) => {
  if (!expense.receipt_path) {
    return null;
  }

  return (
    <DropdownMenuItem onClick={onClick}>
      <Receipt className="h-4 w-4" />
      {t('receipt.receipt')}
    </DropdownMenuItem>
  );
};

const renderReceiptViewer = (
  expense: Expense,
  isOpen: boolean,
  onClose: () => void,
) => {
  if (!expense.receipt_path) {
    return null;
  }

  return (
    <ReceiptViewer
      receiptPath={expense.receipt_path}
      open={isOpen}
      onClose={onClose}
    />
  );
};
