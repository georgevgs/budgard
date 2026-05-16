import { format, parseISO } from 'date-fns';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Settings2 from 'lucide-react/dist/esm/icons/settings-2';
import {
  formatCurrency,
  formatCurrencyInput,
} from '@/lib/utils';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

export const INCOME_COLORS = [
  '#10b981',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#84cc16',
];

export type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export const getInitialAmount = (
  income: Expense | undefined,
  defaultCurrency: string,
): string => {
  if (!income) return '';

  const sourceAmount = pickSourceAmount(income, defaultCurrency);

  return formatCurrencyInput(sourceAmount.toString().replace('.', ','));
};

export const pickSourceAmount = (
  income: Expense,
  defaultCurrency: string,
): number => {
  const isForeign =
    income.original_currency && income.original_currency !== defaultCurrency;
  if (isForeign) return income.original_amount ?? income.amount;

  return income.amount;
};

export const getInitialDate = (income: Expense | undefined): Date => {
  if (income) return parseISO(income.date);

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

export const getQuickCreateLabel = (
  isCreating: boolean,
  trimmedSearch: string,
  t: TranslateFunction,
): string => {
  if (isCreating) return t('common.saving');

  return t('income.createCategory', { name: trimmedSearch });
};

export const renderFormTitle = (isEditing: boolean, t: TranslateFunction) => {
  if (isEditing) return t('income.editIncome');

  return t('income.addIncome');
};

export const renderSaveButtonLabel = (
  isSubmitting: boolean,
  t: TranslateFunction,
) => {
  if (isSubmitting) return t('common.saving');

  return t('income.saveIncome');
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

export const renderCategoryButtonContent = (
  category: Category | undefined,
  t: TranslateFunction,
) => {
  if (!category) {
    return <span>{t('income.selectCategory')}</span>;
  }

  return (
    <span className="flex items-center gap-2">
      {renderCategoryDot(category)}
      {category.name}
    </span>
  );
};

export const renderCategoryDot = (category: Category) => {
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

export const renderBottomAction = (
  showCreate: boolean,
  isCreating: boolean,
  trimmedSearch: string,
  onCreate: () => void,
  onManage: () => void,
  t: TranslateFunction,
) => {
  if (showCreate) {
    const label = getQuickCreateLabel(isCreating, trimmedSearch, t);

    return (
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent focus-visible:outline-none focus-visible:bg-accent text-left text-primary border-t border-border/40 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onCreate}
        disabled={isCreating}
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent focus-visible:outline-none focus-visible:bg-accent text-left text-muted-foreground hover:text-foreground border-t border-border/40"
      onClick={onManage}
    >
      <Settings2 className="h-3.5 w-3.5 shrink-0" />
      {t('income.manageSources')}
    </button>
  );
};
