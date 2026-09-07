import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/common/ui/button';
import { ScrollSafeDropdownMenuTrigger } from '@/common/components/common/ScrollSafeDropdownMenuTrigger';
import { ConfirmDestructiveDialog } from '@/common/components/common/ConfirmDestructiveDialog';
import type { TranslateFunction } from '@/constants/translate';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/common/ui/dropdown-menu';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import type { Expense } from '@/types/Expense';

type IncomeCardActionsProps = {
  income: Expense;
  onEdit: (income: Expense) => void;
  onDelete: (id: string) => void;
};

export const IncomeCardActions = ({ income, onEdit, onDelete }: IncomeCardActionsProps) => {
  const { t } = useTranslation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleDeleteClick = () => {
    blurActiveElement();
    setIsMenuOpen(false);
    setTimeout(() => setIsDeleteDialogOpen(true), 0);
  };

  const handleEditClick = () => {
    blurActiveElement();
    setIsMenuOpen(false);
    setTimeout(() => onEdit(income), 0);
  };

  const handleConfirmDelete = () => {
    onDelete(income.id);
    setIsDeleteDialogOpen(false);
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
          {renderEditMenuItem(income, t, handleEditClick)}
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

      <ConfirmDestructiveDialog
        open={isDeleteDialogOpen}
        title={t('income.deleteTitle')}
        description={t('income.deleteConfirmation') + t('common.actionUndone')}
        confirmLabel={t('common.delete')}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};
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
  if (income.recurring_expense_id) {
    return null;
  }

  return (
    <DropdownMenuItem onClick={onClick}>
      <Pencil className="h-4 w-4" />
      {t('common.edit')}
    </DropdownMenuItem>
  );
};
