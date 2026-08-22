import type { TFunction } from 'i18next';
import { parseISO } from 'date-fns';
import Tag from 'lucide-react/dist/esm/icons/tag';
import { amountToInput, formatCurrency } from '@/lib/utils';
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

  return amountToInput(pickSourceAmount(expense, defaultCurrency), sourceCurrency);
};

// The currency the amount field is denominated in: the currency the row was
// logged in when that differs from today's default, otherwise the default.
// Editing a foreign row shows the foreign figure, so it has to be rounded and
// masked in that currency's minor unit, not the default's.
export const resolveSourceCurrency = (
  transaction: Expense,
  defaultCurrency: string,
): string => {
  if (
    transaction.original_currency &&
    transaction.original_currency !== defaultCurrency
  ) {
    return transaction.original_currency;
  }

  return defaultCurrency;
};

const pickSourceAmount = (
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
      <p className="text-xs text-destructive-ink mt-1">
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
