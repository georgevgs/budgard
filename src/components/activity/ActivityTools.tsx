import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Download from 'lucide-react/dist/esm/icons/download';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import TagIcon from 'lucide-react/dist/esm/icons/tag';
import Upload from 'lucide-react/dist/esm/icons/upload';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ActivityCategorySelect from '@/components/activity/ActivityCategorySelect';
import { TagManager } from '@/components/tags/TagManager';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import type { Category } from '@/types/Category';
import type { Tag } from '@/types/Tag';

// Lazy: the CSV import flow (~35 KB min incl. parsing logic) is a rare,
// user-initiated action — no reason to ship it with the Activity chunk.
const CsvImportDialog = lazyWithRetry(
  () => import('@/components/expenses/CsvImportDialog'),
);

type Props = {
  categories: Category[];
  tags: Tag[];
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  isExportDisabled: boolean;
  isPro: boolean;
  onCategoryChange: (categoryId: string | null) => void;
  onTagChange: (tagId: string | null) => void;
  onExport: () => void;
};

const ActivityTools = (props: Props) => {
  const { t } = useTranslation();
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleTagChange = (value: string) => {
    if (value === 'all') {
      props.onTagChange(null);

      return;
    }

    props.onTagChange(value);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActivityCategorySelect
        categories={props.categories}
        selectedCategoryId={props.selectedCategoryId}
        onChange={props.onCategoryChange}
      />
      <Select
        value={props.selectedTagId ?? 'all'}
        onValueChange={handleTagChange}
        disabled={props.tags.length === 0}
      >
        <SelectTrigger
          className="h-11 min-w-40 flex-1 rounded-xl border-border/35 bg-card/72 shadow-none"
          aria-label={t('activity.filterByTag')}
        >
          <TagIcon className="mr-2 h-4 w-4 shrink-0 text-primary" />
          <SelectValue placeholder={t('activity.allTags')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('activity.allTags')}</SelectItem>
          {props.tags.map((tag) => renderTagOption(tag))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 rounded-xl bg-card/72 shadow-none"
        onClick={() => setIsTagManagerOpen(true)}
        aria-label={t('tags.manageTags')}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 rounded-xl bg-card/72 shadow-none"
        onClick={() => setIsImportOpen(true)}
        aria-label={t('activity.importCsv')}
      >
        <Upload className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-11 rounded-xl bg-card/72 px-3 shadow-none"
        onClick={props.onExport}
        disabled={props.isExportDisabled}
      >
        <Download className="mr-2 h-4 w-4" />
        {t('activity.exportCsv')}
        {renderProBadge(props.isPro, t)}
      </Button>

      <Dialog open={isTagManagerOpen} onOpenChange={setIsTagManagerOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-[500px]">
          <TagManager />
        </DialogContent>
      </Dialog>
      {renderImportDialog(isImportOpen, () => setIsImportOpen(false))}
    </div>
  );
};

export default ActivityTools;

// --- Helpers ---

type TFunc = (key: string) => string;

const renderTagOption = (tag: Tag) => (
  <SelectItem key={tag.id} value={tag.id}>
    <span className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: tag.color }}
        aria-hidden="true"
      />
      {tag.name}
    </span>
  </SelectItem>
);

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

const renderProBadge = (isPro: boolean, t: TFunc) => {
  if (isPro) {
    return null;
  }

  return (
    <span className="ml-2 rounded-full bg-primary/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
      {t('activity.proBadge')}
    </span>
  );
};
