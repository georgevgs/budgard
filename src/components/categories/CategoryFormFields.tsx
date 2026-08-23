import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import CategoryColorPicker from '@/components/categories/CategoryColorPicker';
import CategoryIconPicker from '@/components/categories/CategoryIconPicker';
import CategoryKindSelector, {
  type SelectableCategoryKind,
} from '@/components/categories/CategoryKindSelector';
import type { CategoryFormData } from '@/lib/validations';

type Props = {
  form: UseFormReturn<CategoryFormData>;
  isIncomeCategory: boolean;
  isDisabled: boolean;
};

const CategoryFormFields = ({ form, isIncomeCategory, isDisabled }: Props) => {
  const { t } = useTranslation();

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                placeholder={renderNamePlaceholder(isIncomeCategory, t)}
                {...field}
                disabled={isDisabled}
                aria-label={renderNamePlaceholder(isIncomeCategory, t)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="color"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">
              {t('categories.color')}
            </FormLabel>
            <FormControl>
              <CategoryColorPicker
                value={field.value}
                onChange={field.onChange}
                disabled={isDisabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="icon"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">
              {t('categories.icon')}
            </FormLabel>
            <FormControl>
              <CategoryIconPicker
                value={field.value}
                onChange={field.onChange}
                disabled={isDisabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {renderKindField(isIncomeCategory, isDisabled, form)}
    </>
  );
};

export default CategoryFormFields;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderNamePlaceholder = (
  isIncomeCategory: boolean,
  t: TranslateFunction,
) => {
  if (isIncomeCategory) return t('income.sourceName');

  return t('categories.categoryName');
};

const renderKindField = (
  isIncomeCategory: boolean,
  isDisabled: boolean,
  form: UseFormReturn<CategoryFormData>,
) => {
  if (isIncomeCategory) return null;

  return (
    <FormField
      control={form.control}
      name="kind"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <CategoryKindSelector
              value={field.value as SelectableCategoryKind | undefined}
              onChange={field.onChange}
              disabled={isDisabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
