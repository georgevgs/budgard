import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Bookmark from 'lucide-react/dist/esm/icons/bookmark';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Receipt from 'lucide-react/dist/esm/icons/receipt';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import ExpenseDeleteDialog from '@/components/expenses/ExpenseDeleteDialog';
import ReceiptViewer from '@/components/expenses/ReceiptViewer';
import type { Expense } from '@/types/Expense';

type Props = {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onSaveAsTemplate?: (expense: Expense) => void;
};

const ExpensesCardActions = ({
  expense,
  onEdit,
  onDelete,
  onSaveAsTemplate,
}: Props) => {
  const { t } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

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

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">{t('common.openMenu')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {renderEditMenuItem(expense, t, handleEditClick)}
          {renderTemplateMenuItem(onSaveAsTemplate, t, handleSaveAsTemplate)}
          {renderReceiptMenuItem(expense, t, () => setShowReceipt(true))}
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

      <ExpenseDeleteDialog
        expense={expense}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleConfirmDelete}
      />

      {renderReceiptViewer(expense, showReceipt, () => setShowReceipt(false))}
    </>
  );
};

export default ExpensesCardActions;

// ─── Helper render functions ──────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

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
