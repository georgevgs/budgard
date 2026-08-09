import { useTranslation } from 'react-i18next';
import Shapes from 'lucide-react/dist/esm/icons/shapes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UNCATEGORIZED_VALUE } from '@/lib/expenseFilters';
import type { Category } from '@/types/Category';

type Props = {
  categories: Category[];
  selectedCategoryId: string | null;
  onChange: (categoryId: string | null) => void;
};

const ActivityCategorySelect = ({
  categories,
  selectedCategoryId,
  onChange,
}: Props) => {
  const { t } = useTranslation();

  const handleChange = (value: string) => {
    if (value === 'all') {
      onChange(null);

      return;
    }

    onChange(value);
  };

  return (
    <Select
      value={selectedCategoryId ?? 'all'}
      onValueChange={handleChange}
      disabled={categories.length === 0}
    >
      <SelectTrigger
        className="h-11 w-full rounded-xl border-border/35 bg-card/72 shadow-none"
        aria-label={t('activity.filterByCategory')}
      >
        <Shapes className="mr-2 h-4 w-4 shrink-0 text-primary" />
        <SelectValue placeholder={t('activity.allCategories')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('activity.allCategories')}</SelectItem>
        <SelectItem value={UNCATEGORIZED_VALUE}>
          {t('expenses.noCategory')}
        </SelectItem>
        {categories.map((category) => renderCategoryOption(category))}
      </SelectContent>
    </Select>
  );
};

export default ActivityCategorySelect;

// --- Helpers ---

const renderCategoryOption = (category: Category) => (
  <SelectItem key={category.id} value={category.id}>
    <span className="flex items-center gap-2">
      {renderCategoryMark(category)}
      {category.name}
    </span>
  </SelectItem>
);

const renderCategoryMark = (category: Category) => {
  if (category.icon) {
    return <span className="text-sm">{category.icon}</span>;
  }

  return (
    <span
      className="h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: category.color }}
      aria-hidden="true"
    />
  );
};
