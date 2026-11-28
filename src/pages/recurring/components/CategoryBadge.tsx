import type { ReactElement, CSSProperties } from 'react';
import { cn } from '@/constants/utils.ts';
import type { EmbeddedCategory } from '@/types/Category.ts';
import { getColorDiscStyle } from '@/constants/categoryColor';
import { CategoryIcon } from '@/common/components/common/CategoryIcon';

type CategoryBadgeProps = {
  category: EmbeddedCategory;
  className?: string;
};

// A category, as a chip. The fill is the category's own hue in the same flat,
// vivid tone the rows and the transaction hero use, with a white label that
// stays readable on every one of the twenty-four swatches.
//
// The icon comes with it, because that is what identifies a category at a
// glance everywhere else now — the rows, the breakdown, the hero.
export const CategoryBadge = ({
  category,
  className,
}: CategoryBadgeProps): ReactElement => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
      style={getBadgeStyle(category.color)}
    >
      <CategoryIcon icon={category.icon} className="h-3.5 w-3.5" />
      {category.name}
    </div>
  );
};

const getBadgeStyle = (color: string): CSSProperties => {
  return getColorDiscStyle(color);
};
