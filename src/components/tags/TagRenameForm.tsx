import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import { useTagOps } from '@/hooks/dataOps/useTagOps';
import type { Tag } from '@/types/Tag';

type Props = {
  tag: Tag;
  onClose: () => void;
};

const TagRenameForm = ({ tag, onClose }: Props) => {
  const { t } = useTranslation();
  const { handleTagUpdate } = useTagOps();
  const [name, setName] = useState(tag.name);
  const [isSaving, setIsSaving] = useState(false);

  const trimmed = name.trim();
  const canSave =
    trimmed.length > 0 && trimmed.length <= 50 && trimmed !== tag.name;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await handleTagUpdate(tag.id, trimmed);
      onClose();

      return;
    } catch {
      // error toast handled by useTagOps
    }
    setIsSaving(false);
  };

  return (
    <div className="px-4 sm:px-6 pt-4 pb-4 space-y-4">
      <DialogHeader data-draggable-area>
        <DialogTitle className="text-xl">{t('tags.renameTag')}</DialogTitle>
        <DialogDescription>{t('tags.renameDescription')}</DialogDescription>
      </DialogHeader>

      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={50}
        autoComplete="off"
        aria-label={t('tags.tagName')}
      />

      <div className="flex gap-3 justify-end pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSaving}
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !canSave}
        >
          {renderSaveLabel(isSaving, t)}
        </Button>
      </div>
    </div>
  );
};

export default TagRenameForm;

// --- Helpers ---

const renderSaveLabel = (isSaving: boolean, t: (key: string) => string) => {
  if (isSaving) {
    return t('common.saving');
  }

  return t('common.save');
};
