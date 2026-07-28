import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { TagManager } from '@/components/tags/TagManager';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/Category';
import type { Tag } from '@/types/Tag';
import {
  UNCATEGORIZED_VALUE,
  type SortOrder,
  type DateRangePreset,
} from '@/hooks/useExpensesFilter';

type Props = {
  isOpen: boolean;
  categories: Category[];
  tags: Tag[];
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  sortOrder: SortOrder;
  dateRangePreset: DateRangePreset;
  onCategorySelect: (categoryId: string) => void;
  onTagChange: (value: string | null) => void;
  onSortChange: (value: SortOrder) => void;
  onDateRangeChange: (value: DateRangePreset) => void;
};

const ExpensesFilterDrawer = ({
  isOpen,
  categories,
  tags,
  selectedCategoryId,
  selectedTagId,
  sortOrder,
  dateRangePreset,
  onCategorySelect,
  onTagChange,
  onSortChange,
  onDateRangeChange,
}: Props) => {
  const { t } = useTranslation();
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);

  const handleTagSelectChange = (value: string) => {
    if (value === 'all') {
      onTagChange(null);

      return;
    }

    onTagChange(value);
  };

  const handleDateRangeChange = (value: string) => {
    if (value === 'none') {
      onDateRangeChange(null);

      return;
    }

    onDateRangeChange(value as DateRangePreset);
  };

  return (
    <div
      id="expenses-filter-drawer"
      // inert keeps the visually collapsed selects out of the tab order
      // and away from screen readers
      inert={!isOpen}
      className={cn('grid transition-all duration-200', getDrawerClass(isOpen))}
    >
      <div className="overflow-hidden space-y-3">
        <Select
          value={selectedCategoryId || 'all'}
          onValueChange={onCategorySelect}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('expenses.filter.selectCategory')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('expenses.filter.allCategories')}
            </SelectItem>
            <SelectItem value={UNCATEGORIZED_VALUE}>
              {t('expenses.noCategory')}
            </SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  {renderCategoryIcon(category)}
                  {category.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {renderTagsSelect(tags, selectedTagId, t, handleTagSelectChange)}

        {renderManageTagsButton(tags, t, () => setIsTagManagerOpen(true))}

        <Dialog open={isTagManagerOpen} onOpenChange={setIsTagManagerOpen}>
          <DialogContent
            className="sm:max-w-[500px] p-0 gap-0"
            onOpenChange={(open: boolean) => setIsTagManagerOpen(open)}
          >
            <TagManager />
          </DialogContent>
        </Dialog>

        {renderSortSelect(sortOrder, t, onSortChange)}

        {renderDateRangeSelect(dateRangePreset, t, handleDateRangeChange)}
      </div>
    </div>
  );
};

export default ExpensesFilterDrawer;

// ─── Helper render functions ──────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderManageTagsButton = (
  tags: Tag[],
  t: TranslateFunction,
  onOpen: () => void,
) => {
  if (tags.length === 0) return null;

  return (
    <div className="flex justify-end -mt-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground hover:text-foreground"
        onClick={onOpen}
      >
        <Pencil className="h-3 w-3 mr-1.5" />
        {t('tags.manageTags')}
      </Button>
    </div>
  );
};

const getDrawerClass = (isOpen: boolean): string => {
  if (isOpen) {
    return 'grid-rows-[1fr] opacity-100 mt-2';
  }

  return 'grid-rows-[0fr] opacity-0';
};

const renderCategoryIcon = (category: {
  icon?: string | null;
  color: string;
}) => {
  if (category.icon) {
    return <span className="text-sm">{category.icon}</span>;
  }

  return (
    <div
      className="w-3 h-3 rounded-full shrink-0"
      style={{ backgroundColor: category.color }}
    />
  );
};

const renderTagsSelect = (
  tags: Tag[],
  selectedTagId: string | null,
  t: TranslateFunction,
  onValueChange: (value: string) => void,
) => {
  if (tags.length === 0) return null;

  return (
    <Select value={selectedTagId || 'all'} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue
          placeholder={t('expenses.filter.selectTag', {
            defaultValue: 'All tags',
          })}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          {t('expenses.filter.allTags', { defaultValue: 'All tags' })}
        </SelectItem>
        {tags.map((tag) => (
          <SelectItem key={tag.id} value={tag.id}>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const renderSortSelect = (
  sortOrder: SortOrder,
  t: TranslateFunction,
  onSortChange: (value: SortOrder) => void,
) => {
  return (
    <Select value={sortOrder} onValueChange={onSortChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="date-desc">{t('expenses.sort.dateDesc')}</SelectItem>
        <SelectItem value="date-asc">{t('expenses.sort.dateAsc')}</SelectItem>
        <SelectItem value="amount-desc">
          {t('expenses.sort.amountDesc')}
        </SelectItem>
        <SelectItem value="amount-asc">
          {t('expenses.sort.amountAsc')}
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

const renderDateRangeSelect = (
  dateRangePreset: DateRangePreset,
  t: TranslateFunction,
  onValueChange: (value: string) => void,
) => {
  return (
    <Select value={dateRangePreset ?? 'none'} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={t('expenses.filter.dateRange')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{t('expenses.filter.noDateRange')}</SelectItem>
        <SelectItem value="last7">{t('expenses.filter.last7Days')}</SelectItem>
        <SelectItem value="last30">
          {t('expenses.filter.last30Days')}
        </SelectItem>
        <SelectItem value="last90">
          {t('expenses.filter.last90Days')}
        </SelectItem>
        <SelectItem value="thisQuarter">
          {t('expenses.filter.thisQuarter')}
        </SelectItem>
        <SelectItem value="thisYear">
          {t('expenses.filter.thisYear')}
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
