import X from 'lucide-react/dist/esm/icons/x';
import { useTranslation } from 'react-i18next';
import type { EmbeddedTag } from '@/types/Tag';

type TagChipProps = {
  tag: EmbeddedTag;
  onRemove: () => void;
};

// Removable chip for a selected tag in the expense form's multi-select.
export const TagChip = ({ tag, onRemove }: TagChipProps) => {
  const { t } = useTranslation();

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 py-0.5 pl-2 pr-1 text-xs">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: tag.color }}
        aria-hidden="true"
      />
      {tag.name}
      <button
        type="button"
        aria-label={t('expenses.removeTag', { name: tag.name })}
        className="p-0.5 rounded-full opacity-60 hover:opacity-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
};
