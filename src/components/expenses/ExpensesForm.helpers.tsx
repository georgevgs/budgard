import type { TFunction } from 'i18next';
import { format, parseISO } from 'date-fns';
import Tag from 'lucide-react/dist/esm/icons/tag';
import {
  formatCurrency,
  formatCurrencyInput,
} from '@/lib/utils';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import { TagClearButton } from '@/components/expenses/TagPicker';

export type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export const getInitialAmount = (
  expense: Expense | undefined,
  defaultCurrency: string,
): string => {
  if (!expense) return '';

  const sourceAmount = pickSourceAmount(expense, defaultCurrency);

  return formatCurrencyInput(sourceAmount.toString().replace('.', ','));
};

export const pickSourceAmount = (
  expense: Expense,
  defaultCurrency: string,
): number => {
  const isForeign =
    expense.original_currency && expense.original_currency !== defaultCurrency;
  if (isForeign) return expense.original_amount ?? expense.amount;

  return expense.amount;
};

export const getInitialDate = (expense: Expense | undefined): Date => {
  if (expense) return parseISO(expense.date);

  return new Date();
};

export const formatWatchedDate = (watchedDate: Date | undefined): string => {
  if (!watchedDate) return '';

  return format(watchedDate, 'yyyy-MM-dd');
};

export const normalizeCategoryId = (categoryId: string): string | null => {
  if (categoryId === 'none') return null;

  return categoryId;
};

export const getDetailsRowsClass = (showDetails: boolean): string => {
  if (showDetails) return 'grid-rows-[1fr]';

  return 'grid-rows-[0fr]';
};

export const renderDetailsToggleLabel = (
  showDetails: boolean,
  t: TranslateFunction,
) => {
  if (showDetails) return t('expenses.lessDetails');

  return t('expenses.moreDetails');
};

export const renderSaveButtonLabel = (
  isSubmitting: boolean,
  t: TranslateFunction,
) => {
  if (isSubmitting) return t('common.saving');

  return t('expenses.saveExpense');
};

export const renderConversionPreview = (
  isLoading: boolean,
  hasError: boolean,
  convertedAmount: number | null,
  currency: string,
  targetCurrency: string,
  t: TranslateFunction,
) => {
  if (currency === targetCurrency) return null;

  if (isLoading) {
    return (
      <p className="text-xs text-muted-foreground mt-1">
        {t('expenses.currency.fetchingRate')}
      </p>
    );
  }

  if (hasError) {
    return (
      <p className="text-xs text-destructive mt-1">
        {t('expenses.currency.rateError')}
      </p>
    );
  }

  if (!convertedAmount) return null;

  return (
    <p className="text-xs text-muted-foreground mt-1">
      {t('expenses.currency.convertedAmount', {
        amount: formatCurrency(convertedAmount, targetCurrency),
      })}
    </p>
  );
};

export const renderFormTitle = (isEditing: boolean, t: TranslateFunction) => {
  if (isEditing) return t('expenses.editExpense');

  return t('expenses.addExpense');
};

export const renderTagClearIndicator = (
  selectedTag: { name: string; color: string } | undefined,
  onClear: () => void,
) => {
  if (!selectedTag) return null;

  return <TagClearButton onClear={onClear} />;
};

export const renderCreateTagOption = (
  showCreateOption: boolean,
  isCreatingTag: boolean,
  tagSearch: string,
  onCreate: () => void,
  t: TFunction,
) => {
  if (!showCreateOption) return null;

  let label: string;
  if (isCreatingTag) {
    label = t('expenses.creatingTag');
  } else {
    label = t('expenses.createTagWithName', { name: tagSearch.trim() });
  }

  return (
    <button
      type="button"
      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left text-primary focus-visible:outline-none focus-visible:bg-accent disabled:opacity-50 disabled:pointer-events-none"
      onClick={onCreate}
      disabled={isCreatingTag}
    >
      <Tag className="h-3 w-3 shrink-0" />
      {label}
    </button>
  );
};

export const renderSuggestionMeta = (suggestion: Expense) => {
  if (!suggestion.category) return null;

  return (
    <span className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
      {renderSuggestionIcon(suggestion.category)}
      {suggestion.category.name}
    </span>
  );
};

const renderSuggestionIcon = (category: Category) => {
  if (category.icon) {
    return <span className="text-xs">{category.icon}</span>;
  }

  return (
    <span
      className="w-2 h-2 rounded-full"
      style={{ backgroundColor: category.color }}
    />
  );
};

export const renderCategoryIndicator = (category: Category) => {
  if (category.icon) {
    return <span className="text-sm">{category.icon}</span>;
  }

  return (
    <div
      className="w-3 h-3 rounded-full shrink-0"
      style={{ backgroundColor: category.color }}
      aria-hidden="true"
    />
  );
};

export const renderNoTagsMessage = (
  filteredCount: number,
  showCreateOption: boolean,
  t: TFunction,
) => {
  if (filteredCount > 0 || showCreateOption) return null;

  return (
    <p className="px-3 py-2 text-sm text-muted-foreground">
      {t('expenses.noTagsFound')}
    </p>
  );
};
