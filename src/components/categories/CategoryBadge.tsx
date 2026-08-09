import type { ReactElement, CSSProperties } from 'react';
import { cn } from '@/lib/utils.ts';
import type { EmbeddedCategory } from '@/types/Category.ts';
import { getColorTint } from '@/lib/categoryColor';

type CategoryBadgeProps = {
  category: EmbeddedCategory;
  className?: string;
}

const CategoryBadge = ({
  category,
  className,
}: CategoryBadgeProps): ReactElement => {
  const style = getBadgeStyle(category.color);

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
      style={style}
    >
      {category.name}
    </div>
  );
};

const getBadgeStyle = (color: string): CSSProperties => {
  return {
    backgroundColor: getColorTint(color),
    color: color,
  };
};

export default CategoryBadge;
