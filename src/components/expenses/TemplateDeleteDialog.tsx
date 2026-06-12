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

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const TemplateDeleteDialog = ({ open, onCancel, onConfirm }: Props) => {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent className="sm:max-w-[425px]" onOpenChange={onCancel}>
        <AlertDialogHeader data-draggable-area>
          <AlertDialogTitle>{t('templates.deleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('templates.deleteConfirmation')}
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

export default TemplateDeleteDialog;
