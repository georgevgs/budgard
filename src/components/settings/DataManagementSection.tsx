import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';

type TFunc = (key: string, options?: Record<string, unknown>) => string;

type DataManagementSectionProps = {
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
  t: TFunc;
};

const DataManagementSection = ({
  onConfirmDelete,
  isDeleting,
  t,
}: DataManagementSectionProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleConfirm = async () => {
    await onConfirmDelete();
    setShowDeleteDialog(false);
  };

  return (
    <section className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {t('settings.data.title')}
      </p>
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground mb-3">
            {t('settings.data.deleteAccountDescription')}
          </p>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('settings.data.deleteAccount')}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent
          className="sm:max-w-[425px]"
          onOpenChange={setShowDeleteDialog}
        >
          <AlertDialogHeader data-draggable-area>
            <AlertDialogTitle>
              {t('settings.data.deleteAccountConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.data.deleteAccountConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('settings.data.deleteAccountConfirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default DataManagementSection;
