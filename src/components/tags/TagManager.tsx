import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import TagIcon from 'lucide-react/dist/esm/icons/tag';
import { Button } from '@/components/ui/button';
import {
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import ConfirmDestructiveDialog from '@/components/common/ConfirmDestructiveDialog';
import { useTagsData } from '@/contexts/DataContext';
import { useTagOps } from '@/hooks/dataOps/useTagOps';
import type { Tag } from '@/types/Tag';
import TagRenameForm from '@/components/tags/TagRenameForm';

type View = { type: 'list' } | { type: 'form'; tag: Tag };

export const TagManager = () => {
  const { t } = useTranslation();
  const tags = useTagsData();
  const { handleTagDelete } = useTagOps();
  const [view, setView] = useState<View>({ type: 'list' });
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await handleTagDelete(deleteTarget.id);
    } catch {
      // error toast handled by useTagOps
    }
    setDeleteTarget(null);
  };

  if (view.type === 'form') {
    return (
      <TagRenameForm tag={view.tag} onClose={() => setView({ type: 'list' })} />
    );
  }

  return (
    <>
      <div
        className="flex justify-center pt-3 pb-2 sm:hidden shrink-0"
        data-drag-handle
      >
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
      </div>

      <div className="px-4 sm:px-6 pt-2 sm:pt-4 pb-2 shrink-0">
        <DialogHeader data-draggable-area>
          <DialogTitle className="text-xl">{t('tags.title')}</DialogTitle>
          <DialogDescription>{t('tags.manageDescription')}</DialogDescription>
        </DialogHeader>
      </div>

      <div
        className="overflow-y-auto flex-1 min-h-0 px-4 sm:px-6 pb-4 overscroll-contain"
        style={{ touchAction: 'pan-y' }}
      >
        {renderTagList(tags, t, setView, setDeleteTarget)}
      </div>

      <ConfirmDestructiveDialog
        open={deleteTarget !== null}
        title={t('tags.deleteTag')}
        description={t('tags.deleteConfirmation', { name: deleteTarget?.name })}
        confirmLabel={t('common.delete')}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
      />
    </>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderTagList = (
  tags: Tag[],
  t: TFunc,
  setView: (view: View) => void,
  setDeleteTarget: (tag: Tag) => void,
) => {
  if (tags.length === 0) {
    return renderEmptyState(t);
  }

  return (
    <div className="divide-y divide-border/30">
      {tags.map((tag) => (
        <div key={tag.id} className="flex items-center gap-2.5 py-2 group">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: tag.color }}
            aria-hidden="true"
          />
          <span className="flex-1 text-sm font-medium truncate min-w-0">
            {tag.name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 -my-1.5 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setView({ type: 'form', tag })}
            aria-label={t('tags.renameTag')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 -my-1.5 text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => setDeleteTarget(tag)}
            aria-label={t('tags.deleteTag')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
};

const renderEmptyState = (t: TFunc) => {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      <TagIcon
        className="h-12 w-12 text-muted-foreground/50 mb-3"
        aria-hidden="true"
      />
      <p className="text-sm font-medium">{t('tags.noTags')}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
        {t('tags.emptyHelp')}
      </p>
    </div>
  );
};
