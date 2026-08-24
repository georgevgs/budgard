import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import CategoryIcon from '@/components/common/CategoryIcon';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RecurringExpenseFormData } from '@/lib/validations';
import type { Category } from '@/types/Category';

type Props = {
  form: UseFormReturn<RecurringExpenseFormData>;
  categories: Category[];
};

const RecurringExpenseFields = ({ form, categories }: Props) => {
  const { t } = useTranslation();

  return (
    <>
      <FormField
        control={form.control}
        name="amount"
        render={({ field }) => (
          <FormItem>
            <Label>{t('recurring.amount')}</Label>
            <FormControl>
              <CurrencyInput
                currency="EUR"
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder={t('common.amountZero')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <Label>{t('recurring.description')}</Label>
            <FormControl>
              <Input
                placeholder={t('recurring.descriptionPlaceholder')}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="category_id"
        render={({ field }) => (
          <FormItem>
            <Label>{t('recurring.category')}</Label>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('recurring.selectCategory')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">
                  {t('recurring.noCategory')}
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
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

export default RecurringExpenseFields;

// --- Helpers ---

const renderCategoryIcon = (category: {
  icon?: string | null;
  color: string;
}) => {
  if (category.icon) {
    return <CategoryIcon icon={category.icon} />;
  }

  return (
    <div
      className="w-3 h-3 rounded-full shrink-0"
      style={{ backgroundColor: category.color }}
    />
  );
};
