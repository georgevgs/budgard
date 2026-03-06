import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Search from 'lucide-react/dist/esm/icons/search';
import Filter from 'lucide-react/dist/esm/icons/filter';
import X from 'lucide-react/dist/esm/icons/x';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/Category';
import type { Tag } from '@/types/Tag';
import type { SortOrder } from '@/hooks/useExpensesFilter';

const UNCATEGORIZED_VALUE = 'uncategorized';

type ExpensesFilterProps = {
  categories: Category[];
  tags: Tag[];
  search: string;
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  sortOrder: SortOrder;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onTagChange: (value: string | null) => void;
  onSortChange: (value: SortOrder) => void;
  onClearFilters: () => void;
};

const ExpensesFilter = ({
  categories,
  tags,
  search,
  selectedCategoryId,
  selectedTagId,
  sortOrder,
  hasActiveFilters,
  onSearchChange,
  onCategoryChange,
  onTagChange,
  onSortChange,
  onClearFilters,
}: ExpensesFilterProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleCategoryChange = (categoryId: string) => {
    onCategoryChange(categoryId === 'all' ? null : categoryId);
  };

  const handleTagSelectChange = (value: string) => {
    onTagChange(value === 'all' ? null : value);
  };

  const activeFilterCount =
    (search ? 1 : 0) +
    (selectedCategoryId ? 1 : 0) +
    (selectedTagId ? 1 : 0);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('expenses.search.placeholder')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            aria-label={t('expenses.search.label')}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={t('expenses.filter.toggleFilters')}
        >
          <Filter className="h-4 w-4" />
          {renderFilterCountBadge(hasActiveFilters, activeFilterCount)}
        </Button>
      </div>

      <div
        className={cn(
          'grid transition-all duration-200',
          isOpen
            ? 'grid-rows-[1fr] opacity-100 mt-2'
            : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden space-y-3">
          <Select
            value={selectedCategoryId || 'all'}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={t('expenses.filter.selectCategory')}
              />
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
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {renderTagsSelect(tags, selectedTagId, t, handleTagSelectChange)}

          <Select value={sortOrder} onValueChange={onSortChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">
                {t('expenses.sort.dateDesc')}
              </SelectItem>
              <SelectItem value="date-asc">
                {t('expenses.sort.dateAsc')}
              </SelectItem>
              <SelectItem value="amount-desc">
                {t('expenses.sort.amountDesc')}
              </SelectItem>
              <SelectItem value="amount-asc">
                {t('expenses.sort.amountAsc')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {renderActiveFiltersSection({
        search,
        selectedCategoryId,
        selectedTagId,
        hasActiveFilters,
        categories,
        tags,
        t,
        onSearchChange,
        onCategoryChange: handleCategoryChange,
        onTagChange,
        onClearFilters,
      })}
    </div>
  );
};

export default ExpensesFilter;

// ─── Helper render functions ──────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderFilterCountBadge = (
  hasActiveFilters: boolean,
  activeFilterCount: number,
) => {
  if (!hasActiveFilters) return null;

  return (
    <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
      {activeFilterCount}
    </span>
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

type ActiveFiltersSectionProps = {
  search: string;
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  hasActiveFilters: boolean;
  categories: Category[];
  tags: Tag[];
  t: TranslateFunction;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onTagChange: (value: string | null) => void;
  onClearFilters: () => void;
};

const renderActiveFiltersSection = (props: ActiveFiltersSectionProps) => {
  const {
    search,
    selectedCategoryId,
    selectedTagId,
    hasActiveFilters,
    categories,
    tags,
    t,
    onSearchChange,
    onCategoryChange,
    onTagChange,
    onClearFilters,
  } = props;

  if (!hasActiveFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {renderSearchBadge(search, t, onSearchChange)}
      {renderCategoryFilterBadge(
        selectedCategoryId,
        categories,
        t,
        onCategoryChange,
      )}
      {renderTagFilterBadge(selectedTagId, tags, onTagChange)}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearFilters}
        className="h-6 px-2 text-xs ml-auto"
      >
        {t('expenses.filter.clearAll')}
      </Button>
    </div>
  );
};

const renderSearchBadge = (
  search: string,
  t: TranslateFunction,
  onClear: (value: string) => void,
) => {
  if (!search) return null;

  return (
    <Badge variant="secondary" className="text-xs">
      {t('expenses.search.active', { query: search })}
      <X
        className="h-3 w-3 ml-1 cursor-pointer"
        onClick={() => onClear('')}
      />
    </Badge>
  );
};

const renderCategoryFilterBadge = (
  selectedCategoryId: string | null,
  categories: Category[],
  t: TranslateFunction,
  onClear: (value: string) => void,
) => {
  if (!selectedCategoryId) return null;

  const categoryName =
    selectedCategoryId === UNCATEGORIZED_VALUE
      ? t('expenses.noCategory')
      : categories.find((c) => c.id === selectedCategoryId)?.name;

  return (
    <Badge variant="secondary" className="text-xs">
      {t('expenses.filter.categoryFilter', { name: categoryName })}
      <X
        className="h-3 w-3 ml-1 cursor-pointer"
        onClick={() => onClear('all')}
      />
    </Badge>
  );
};

const renderTagFilterBadge = (
  selectedTagId: string | null,
  tags: Tag[],
  onClear: (value: string | null) => void,
) => {
  if (!selectedTagId) return null;

  const tagName = tags.find((tag) => tag.id === selectedTagId)?.name;

  return (
    <Badge variant="secondary" className="text-xs">
      {tagName}
      <X
        className="h-3 w-3 ml-1 cursor-pointer"
        onClick={() => onClear(null)}
      />
    </Badge>
  );
};
