import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-foreground shrink-0"
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">{t('common.openMenu')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem onClick={handleEditClick}>
            {t('common.edit')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDeleteClick}
            className="text-destructive focus:text-destructive"
          >
            {t('common.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent
          className="sm:max-w-[425px]"
          onOpenChange={setShowDeleteDialog}
        >
          <AlertDialogHeader data-draggable-area>
            <AlertDialogTitle>{t('goals.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('goals.deleteConfirmation', { name: goal.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
