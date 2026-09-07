import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/common/ui/button';
import { ScrollSafeDropdownMenuTrigger } from '@/common/components/common/ScrollSafeDropdownMenuTrigger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/common/ui/dropdown-menu';
import { ConfirmDestructiveDialog } from '@/common/components/common/ConfirmDestructiveDialog';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import type { Goal } from '@/types/Goal';

type GoalCardActionsProps = {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
};

export const GoalCardActions = ({ goal, onEdit, onDelete }: GoalCardActionsProps) => {
  const { t } = useTranslation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleEditClick = () => {
    blurActiveElement();
    setIsDropdownOpen(false);
    setTimeout(() => onEdit(goal), 0);
  };

  const handleDeleteClick = () => {
    blurActiveElement();
    setIsDropdownOpen(false);
    setTimeout(() => setIsDeleteDialogOpen(true), 0);
  };

  const handleConfirmDelete = () => {
    onDelete(goal.id);
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
            className="h-10 w-10 text-muted-foreground hover:text-foreground shrink-0"
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
        title={t('goals.deleteTitle')}
        description={t('goals.deleteConfirmation', { name: goal.name })}
        confirmLabel={t('common.delete')}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};
// --- Helpers ---

const blurActiveElement = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};
