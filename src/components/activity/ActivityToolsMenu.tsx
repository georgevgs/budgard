import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Download from 'lucide-react/dist/esm/icons/download';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import TagIcon from 'lucide-react/dist/esm/icons/tag';
import Upload from 'lucide-react/dist/esm/icons/upload';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TagManager } from '@/components/tags/TagManager';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

// Lazy: the CSV import flow (~35 KB min incl. parsing logic) is a rare,
// user-initiated action — no reason to ship it with the Activity chunk.
const CsvImportDialog = lazyWithRetry(
  () => import('@/components/expenses/CsvImportDialog'),
);

type Props = {
  isExportDisabled: boolean;
  onExport: () => void;
};

// Import, export and tag management are things you do a handful of times a
// year. They used to be pinned above a list opened every day; an overflow menu
// on the page header is the right weight for them.
const ActivityToolsMenu = ({ isExportDisabled, onExport }: Props) => {
  const { t } = useTranslation();
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full p-0 bg-muted text-foreground hover:bg-muted/80 ring-1 ring-border/40"
            aria-label={t('activity.tools.label')}
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => setIsTagManagerOpen(true)}>
            <TagIcon className="h-4 w-4" />
            {t('tags.manageTags')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
            <Upload className="h-4 w-4" />
            {t('activity.importCsv')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExport} disabled={isExportDisabled}>
            <Download className="h-4 w-4" />
            {t('activity.exportCsv')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isTagManagerOpen} onOpenChange={setIsTagManagerOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-[500px]">
          <TagManager />
        </DialogContent>
      </Dialog>
      {renderImportDialog(isImportOpen, () => setIsImportOpen(false))}
    </>
  );
};

export default ActivityToolsMenu;

// --- Helpers ---

// Mounted only once opened so the parse/mapping chunk is fetched on demand.
const renderImportDialog = (isOpen: boolean, onClose: () => void) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <CsvImportDialog open onClose={onClose} />
    </Suspense>
  );
};
