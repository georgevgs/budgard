import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import ScrollSafeDropdownMenuTrigger from '@/components/common/ScrollSafeDropdownMenuTrigger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import ConfirmDestructiveDialog from '@/components/common/ConfirmDestructiveDialog';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import type { Goal } from '@/types/Goal';

type Props = {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
};

const GoalCardActions = ({ goal, onEdit, onDelete }: Props) => {
  const { t } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleEditClick = () => {
    blurActiveElement();
    setDropdownOpen(false);
    setTimeout(() => onEdit(goal), 0);
  };

  const handleDeleteClick = () => {
    blurActiveElement();
    setDropdownOpen(false);
    setTimeout(() => setShowDeleteDialog(true), 0);
  };

  const handleConfirmDelete = () => {
    onDelete(goal.id);
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
        open={showDeleteDialog}
        title={t('goals.deleteTitle')}
        description={t('goals.deleteConfirmation', { name: goal.name })}
        confirmLabel={t('common.delete')}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default GoalCardActions;

// --- Helpers ---

const blurActiveElement = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};
