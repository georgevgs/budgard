import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Search from 'lucide-react/dist/esm/icons/search';
import Filter from 'lucide-react/dist/esm/icons/filter';
import X from 'lucide-react/dist/esm/icons/x';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ExpensesFilterDrawer from '@/components/expenses/ExpensesFilterDrawer';
import type { Category } from '@/types/Category';
import type { Tag } from '@/types/Tag';
import {
  UNCATEGORIZED_VALUE,
  type SortOrder,
  type DateRangePreset,
} from '@/hooks/useExpensesFilter';

type ExpensesFilterProps = {
  categories: Category[];
  tags: Tag[];
  search: string;
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  sortOrder: SortOrder;
  hasActiveFilters: boolean;
  isSearchingAllMonths: boolean;
  dateRangePreset: DateRangePreset;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onTagChange: (value: string | null) => void;
  onSortChange: (value: SortOrder) => void;
  onSearchScopeChange: (value: boolean) => void;
  onDateRangeChange: (value: DateRangePreset) => void;
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
  isSearchingAllMonths,
  dateRangePreset,
  onSearchChange,
  onCategoryChange,
  onTagChange,
  onSortChange,
  onSearchScopeChange,
  onDateRangeChange,
  onClearFilters,
}: ExpensesFilterProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleCategoryChange = (categoryId: string) =>
    onCategoryChange(normalizeAllValue(categoryId));

  const activeFilterCount = countActiveFilters([
    search,
    selectedCategoryId,
    selectedTagId,
    dateRangePreset,
  ]);

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
          aria-expanded={isOpen}
          aria-controls="expenses-filter-drawer"
        >
          <Filter className="h-4 w-4" />
          {renderFilterCountBadge(hasActiveFilters, activeFilterCount)}
        </Button>
      </div>

      {renderSearchScopeToggle(
        hasActiveFilters,
        isSearchingAllMonths,
        t,
        onSearchScopeChange,
      )}

      <ExpensesFilterDrawer
        isOpen={isOpen}
        categories={categories}
        tags={tags}
        selectedCategoryId={selectedCategoryId}
        selectedTagId={selectedTagId}
        sortOrder={sortOrder}
        dateRangePreset={dateRangePreset}
        onCategorySelect={handleCategoryChange}
        onTagChange={onTagChange}
        onSortChange={onSortChange}
        onDateRangeChange={onDateRangeChange}
      />

      {renderActiveFiltersSection({
        search,
        selectedCategoryId,
        selectedTagId,
        dateRangePreset,
        hasActiveFilters,
        categories,
        tags,
        t,
        onSearchChange,
        onCategoryChange: handleCategoryChange,
        onTagChange,
        onDateRangeChange,
        onClearFilters,
      })}
    </div>
  );
};

export default memo(ExpensesFilter);

// ─── Helper render functions ──────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderSearchScopeToggle = (
  hasActiveFilters: boolean,
  isSearchingAllMonths: boolean,
  t: TranslateFunction,
  onScopeChange: (value: boolean) => void,
) => {
  if (!hasActiveFilters) return null;

  return (
    <div className="inline-flex rounded-full bg-muted p-0.5 mt-2">
      <button
        type="button"
        onClick={() => onScopeChange(false)}
        className={cn(
          'text-xs px-3 py-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          getScopeButtonClass(!isSearchingAllMonths),
        )}
      >
        {t('expenses.search.thisMonth')}
      </button>
      <button
        type="button"
        onClick={() => onScopeChange(true)}
        className={cn(
          'text-xs px-3 py-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          getScopeButtonClass(isSearchingAllMonths),
        )}
      >
        {t('expenses.search.allMonths')}
      </button>
    </div>
  );
};

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

type ActiveFiltersSectionProps = {
  search: string;
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  dateRangePreset: DateRangePreset;
  hasActiveFilters: boolean;
  categories: Category[];
  tags: Tag[];
  t: TranslateFunction;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onTagChange: (value: string | null) => void;
  onDateRangeChange: (value: DateRangePreset) => void;
  onClearFilters: () => void;
};

const renderActiveFiltersSection = (props: ActiveFiltersSectionProps) => {
  const {
    search,
    selectedCategoryId,
    selectedTagId,
    dateRangePreset,
    hasActiveFilters,
    categories,
    tags,
    t,
    onSearchChange,
    onCategoryChange,
    onTagChange,
    onDateRangeChange,
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
      {renderTagFilterBadge(selectedTagId, tags, t, onTagChange)}
      {renderDateRangeBadge(dateRangePreset, t, onDateRangeChange)}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearFilters}
        className="px-2 text-xs ml-auto"
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
    <Badge variant="secondary" className="text-xs gap-1">
      {t('expenses.search.active', { query: search })}
      <button
        type="button"
        className="ml-0.5 p-1 -mr-1 rounded-full hover:bg-muted-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        onClick={() => onClear('')}
        aria-label={t('expenses.filter.clearSearch', {
          defaultValue: 'Clear search',
        })}
      >
        <X className="h-3 w-3" />
      </button>
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

  const categoryName = resolveCategoryName(
    selectedCategoryId,
    categories,
    t,
  );

  return (
    <Badge variant="secondary" className="text-xs gap-1">
      {t('expenses.filter.categoryFilter', { name: categoryName })}
      <button
        type="button"
        className="ml-0.5 p-1 -mr-1 rounded-full hover:bg-muted-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        onClick={() => onClear('all')}
        aria-label={t('expenses.filter.clearCategory', {
          defaultValue: 'Clear category filter',
        })}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
};

const renderTagFilterBadge = (
  selectedTagId: string | null,
  tags: Tag[],
  t: TranslateFunction,
  onClear: (value: string | null) => void,
) => {
  if (!selectedTagId) return null;

  const tagName = tags.find((tag) => tag.id === selectedTagId)?.name;

  return (
    <Badge variant="secondary" className="text-xs gap-1">
      {tagName}
      <button
        type="button"
        className="ml-0.5 p-1 -mr-1 rounded-full hover:bg-muted-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        onClick={() => onClear(null)}
        aria-label={t('expenses.filter.clearTag', {
          defaultValue: 'Clear tag filter',
        })}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
};

const DATE_RANGE_LABELS: Record<string, string> = {
  last7: 'expenses.filter.last7Days',
  last30: 'expenses.filter.last30Days',
  last90: 'expenses.filter.last90Days',
  thisQuarter: 'expenses.filter.thisQuarter',
  thisYear: 'expenses.filter.thisYear',
};

const renderDateRangeBadge = (
  dateRangePreset: DateRangePreset,
  t: TranslateFunction,
  onClear: (value: DateRangePreset) => void,
) => {
  if (!dateRangePreset) return null;

  const labelKey = DATE_RANGE_LABELS[dateRangePreset];

  return (
    <Badge variant="secondary" className="text-xs gap-1">
      {t(labelKey)}
      <button
        type="button"
        className="ml-0.5 p-1 -mr-1 rounded-full hover:bg-muted-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        onClick={() => onClear(null)}
        aria-label={t('expenses.filter.clearDateRange', {
          defaultValue: 'Clear date range',
        })}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
};

const countActiveFilters = (values: unknown[]): number =>
  values.filter(Boolean).length;

const normalizeAllValue = (value: string): string | null => {
  if (value === 'all') return null;

  return value;
};

const getScopeButtonClass = (active: boolean): string => {
  if (active) {
    return 'bg-background text-foreground shadow-sm';
  }

  return 'text-muted-foreground hover:text-foreground';
};

const resolveCategoryName = (
  selectedCategoryId: string,
  categories: Category[],
  t: TranslateFunction,
): string | undefined => {
  if (selectedCategoryId === UNCATEGORIZED_VALUE) {
    return t('expenses.noCategory');
  }

  return categories.find((c) => c.id === selectedCategoryId)?.name;
};
