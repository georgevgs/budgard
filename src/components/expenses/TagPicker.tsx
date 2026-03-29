import Tag from 'lucide-react/dist/esm/icons/tag';
import X from 'lucide-react/dist/esm/icons/x';

type TagInfo = {
  name: string;
  color: string;
};

type TagButtonContentProps = {
  selectedTag: TagInfo | undefined;
};

export const TagButtonContent = ({ selectedTag }: TagButtonContentProps) => {
  if (!selectedTag) {
    return (
      <span className="flex items-center gap-2">
        <Tag className="h-4 w-4" />
        No tag
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: selectedTag.color }}
      />
      {selectedTag.name}
    </span>
  );
};

type TagClearButtonProps = {
  onClear: () => void;
};

export const TagClearButton = ({ onClear }: TagClearButtonProps) => {
  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onClear();
  };

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label="Clear tag"
      className="ml-auto p-1 -mr-1 shrink-0 opacity-50 hover:opacity-100 rounded-full cursor-pointer"
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick(event as unknown as React.MouseEvent);
        }
      }}
    >
      <X className="h-3.5 w-3.5" />
    </span>
  );
};
