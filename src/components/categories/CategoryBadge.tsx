import type { ReactElement, CSSProperties } from 'react';
import { cn } from '@/lib/utils.ts';
import type { EmbeddedCategory } from '@/types/Category.ts';
import { getColorTint } from '@/lib/categoryColor';

type CategoryBadgeProps = {
  category: EmbeddedCategory;
  className?: string;
};

// A category, as a chip. The tint is the category's own colour — the sanctioned
// way to carry a user-picked hue, same as the transaction hero and the quick-add
// chips — but the LABEL is ink.
//
// It used to be the raw hue: `color: category.color` on a 22% wash of that same
// hue, which is the bare-fill-as-text mistake the three-role rule exists to
// stop. On the seeded Transport blue it measured about 2.5:1, and every chip in
// the app got a different answer depending on which of twenty-four swatches the
// user had picked.
//
// The emoji comes with it, because that is what identifies a category at a
// glance everywhere else now — the rows, the breakdown, the hero.
const CategoryBadge = ({
  category,
  className,
}: CategoryBadgeProps): ReactElement => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-foreground',
        className,
      )}
      style={getBadgeStyle(category.color)}
    >
      {renderIcon(category.icon)}
      {category.name}
    </div>
  );
};

export default CategoryBadge;

// --- Helpers ---

const getBadgeStyle = (color: string): CSSProperties => {
  return { backgroundColor: getColorTint(color) };
};

const renderIcon = (icon: string | null) => {
  if (!icon) {
    return null;
  }

  return (
    <span aria-hidden="true" className="leading-none">
      {icon}
    </span>
  );
};
