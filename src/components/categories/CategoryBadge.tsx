import type { ReactElement, CSSProperties } from 'react';
import { cn } from '@/lib/utils.ts';
import type { Category } from '@/types/Category.ts';

interface CategoryBadgeProps {
  category: Category;
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
    backgroundColor: `${color}20`,
    color: color,
  };
};

export default CategoryBadge;
