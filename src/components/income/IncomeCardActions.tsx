import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import ConfirmDestructiveDialog from '@/components/common/ConfirmDestructiveDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import type { Expense } from '@/types/Expense';

type Props = {
  income: Expense;
  onEdit: (income: Expense) => void;
  onDelete: (id: string) => void;
};

const IncomeCardActions = ({ income, onEdit, onDelete }: Props) => {
  const { t } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleDeleteClick = () => {
    blurActiveElement();
    setMenuOpen(false);
    setTimeout(() => setShowDeleteDialog(true), 0);
  };

  const handleEditClick = () => {
    blurActiveElement();
    setMenuOpen(false);
    setTimeout(() => onEdit(income), 0);
  };

  const handleConfirmDelete = () => {
    onDelete(income.id);
    setShowDeleteDialog(false);
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
          {renderEditMenuItem(income, t, handleEditClick)}
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

      <ConfirmDestructiveDialog
        open={showDeleteDialog}
        title={t('income.deleteTitle')}
        description={t('income.deleteConfirmation') + t('common.actionUndone')}
        confirmLabel={t('common.delete')}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default IncomeCardActions;

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  income: Expense,
  t: TranslateFunction,
  onClick: () => void,
) => {
  if (income.recurring_expense_id) return null;

  return (
    <DropdownMenuItem onClick={onClick}>
      <Pencil className="h-4 w-4" />
      {t('common.edit')}
    </DropdownMenuItem>
  );
};
