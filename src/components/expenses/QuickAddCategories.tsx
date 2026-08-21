import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { getColorTint } from '@/lib/categoryColor';
import { haptics } from '@/lib/haptics';
import type { Category } from '@/types/Category';

type Props = {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

// A horizontal run of chips rather than a select: picking a category is the
// second of the two taps this screen exists to make cheap, and a dropdown
// turns it into three plus a scroll.
const QuickAddCategories = ({ categories, selectedId, onSelect }: Props) => {
  const { t } = useTranslation();

  if (categories.length === 0) {
    return null;
  }

  return (
    <div
      className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1"
      role="radiogroup"
      aria-label={t('expenses.category')}
    >
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          role="radio"
          aria-checked={category.id === selectedId}
          onClick={() => select(category.id, selectedId, onSelect)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            chipTone(category.id === selectedId),
          )}
          style={chipStyle(category, category.id === selectedId)}
        >
          <span aria-hidden="true">{category.icon ?? '•'}</span>
          {category.name}
        </button>
      ))}
    </div>
  );
};

export default QuickAddCategories;

// --- Helpers ---

// Tapping the selected chip again clears it, so a mis-tap does not force the
// user to hunt for an "uncategorised" option that does not exist here.
const select = (
  id: string,
  selectedId: string | null,
  onSelect: (id: string | null) => void,
) => {
  haptics.selection();
  if (id === selectedId) {
    onSelect(null);

    return;
  }

  onSelect(id);
};

const chipTone = (isSelected: boolean): string => {
  if (isSelected) {
    return 'ring-2 ring-foreground';
  }

  return 'ring-1 ring-border/50';
};

const chipStyle = (category: Category, isSelected: boolean) => {
  if (!isSelected) {
    return undefined;
  }

  return { backgroundColor: getColorTint(category.color) };
};
