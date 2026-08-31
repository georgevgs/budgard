import type { TFunction } from 'i18next';
import { parseISO } from 'date-fns';
import Tag from 'lucide-react/dist/esm/icons/tag';
import CategoryIcon from '@/components/common/CategoryIcon';
import { amountToInput } from '@/lib/utils';
import {
  resolveSourceAmount,
  resolveSourceCurrency,
} from '@/lib/transactionAmount';
import type { Expense } from '@/types/Expense';
import type { Category, EmbeddedCategory } from '@/types/Category';

export type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export const getInitialAmount = (
  expense: Expense | undefined,
  defaultCurrency: string,
  draft?: { amount?: number },
): string => {
  if (!expense) {
    if (typeof draft?.amount === 'number' && draft.amount > 0) {
      return amountToInput(draft.amount, defaultCurrency);
    }

    return '';
  }

  const sourceCurrency = resolveSourceCurrency(expense, defaultCurrency);

  return amountToInput(
    resolveSourceAmount(expense, defaultCurrency),
    sourceCurrency,
  );
};

export const getInitialDate = (
  expense: Expense | undefined,
  draft?: { date?: string },
): Date => {
  if (expense) return parseISO(expense.date);
  if (draft?.date) return parseISO(draft.date);

  return new Date();
};

export const getInitialExtraTagIds = (
  expense: Expense | undefined,
): string[] => {
  if (!expense?.extra_tags) return [];

  return expense.extra_tags.map((tag) => tag.id);
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

export const renderFormTitle = (isEditing: boolean, t: TranslateFunction) => {
  if (isEditing) return t('expenses.editExpense');

  return t('expenses.addExpense');
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
      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left text-primary-ink focus-visible:outline-none focus-visible:bg-accent disabled:opacity-50 disabled:pointer-events-none"
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

const renderSuggestionIcon = (category: EmbeddedCategory) => {
  if (category.icon) {
    return <CategoryIcon icon={category.icon} className="h-3.5 w-3.5" />;
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
    return <CategoryIcon icon={category.icon} />;
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
