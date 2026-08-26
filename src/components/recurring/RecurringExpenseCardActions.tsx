import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import ScrollSafeDropdownMenuTrigger from '@/components/common/ScrollSafeDropdownMenuTrigger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import ConfirmDestructiveDialog from '@/components/common/ConfirmDestructiveDialog';
import type { RecurringExpense } from '@/types/RecurringExpense';

type Props = {
  expense: RecurringExpense;
  onEdit: (expense: RecurringExpense) => void;
  onDelete: (id: string) => void;
};

const RecurringExpenseCardActions = ({ expense, onEdit, onDelete }: Props) => {
  const { t } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleEditClick = () => {
    blurActiveElement();
    setDropdownOpen(false);
    setTimeout(() => onEdit(expense), 0);
  };

  const handleDeleteClick = () => {
    blurActiveElement();
    setDropdownOpen(false);
    setTimeout(() => setShowDeleteDialog(true), 0);
  };

  const handleConfirmDelete = () => {
    onDelete(expense.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <ScrollSafeDropdownMenuTrigger
          asChild
          isOpen={dropdownOpen}
          onOpenChange={setDropdownOpen}
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
        open={showDeleteDialog}
        title={t('recurring.deleteTitle')}
        description={t('recurring.deleteConfirmation')}
        confirmLabel={t('common.delete')}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default RecurringExpenseCardActions;

// --- Helpers ---

const blurActiveElement = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};
