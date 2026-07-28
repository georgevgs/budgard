import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DeleteAccountDialog from '@/components/settings/DeleteAccountDialog';
import { useDataExport } from '@/hooks/settings/useDataExport';
import Download from 'lucide-react/dist/esm/icons/download';
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
  const { isExporting, handleExport } = useDataExport();

  return (
    <section className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {t('settings.data.title')}
      </p>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              {t('settings.data.exportDescription')}
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {renderExportLabel(isExporting, t)}
            </Button>
          </div>

          <div className="border-t border-border/50 pt-4">
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
          </div>
        </CardContent>
      </Card>

      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirmDelete={onConfirmDelete}
        isDeleting={isDeleting}
      />
    </section>
  );
};

export default DataManagementSection;

// --- Helpers ---

const renderExportLabel = (isExporting: boolean, t: TFunc) => {
  if (isExporting) {
    return t('settings.data.exporting');
  }

  return t('settings.data.exportButton');
};
