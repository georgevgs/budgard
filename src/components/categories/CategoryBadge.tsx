import { cn } from "@/lib/Utils.ts";
import type { Category } from "@/types/Category.ts";

type CategoryBadgeProps = {
    category: Category;
    className?: string;
};

const CategoryBadge = ({ category, className }: CategoryBadgeProps) => (
    <div
        className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            className
        )}
        style={{
            backgroundColor: `${category.color}20`,
            color: category.color,
        }}
    >
        {category.name}
    </div>
);

export default CategoryBadge;