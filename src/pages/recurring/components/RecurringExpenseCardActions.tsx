import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/common/ui/button';
import { ScrollSafeDropdownMenuTrigger } from '@/common/components/common/ScrollSafeDropdownMenuTrigger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/common/ui/dropdown-menu';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import { ConfirmDestructiveDialog } from '@/common/components/common/ConfirmDestructiveDialog';
import type { RecurringExpense } from '@/types/RecurringExpense';

type RecurringExpenseCardActionsProps = {
  expense: RecurringExpense;
  onEdit: (expense: RecurringExpense) => void;
  onDelete: (id: string) => void;
};

export const RecurringExpenseCardActions = ({ expense, onEdit, onDelete }: RecurringExpenseCardActionsProps) => {
  const { t } = useTranslation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleEditClick = () => {
    blurActiveElement();
    setIsDropdownOpen(false);
    setTimeout(() => onEdit(expense), 0);
  };

  const handleDeleteClick = () => {
    blurActiveElement();
    setIsDropdownOpen(false);
    setTimeout(() => setIsDeleteDialogOpen(true), 0);
  };

  const handleConfirmDelete = () => {
    onDelete(expense.id);
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <ScrollSafeDropdownMenuTrigger
          asChild
          isOpen={isDropdownOpen}
          onOpenChange={setIsDropdownOpen}
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
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem onClick={handleEditClick}>
            {t('common.edit')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDeleteClick}
            className="text-destructive-ink focus:text-destructive-ink"
          >
            {t('common.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDestructiveDialog
        open={isDeleteDialogOpen}
        title={t('recurring.deleteTitle')}
        description={t('recurring.deleteConfirmation')}
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
