import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePickerField } from '@/components/ui/date-picker-field';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import CategoryColorPicker from '@/components/categories/CategoryColorPicker';
import GoalSourceFields from '@/components/goals/GoalSourceFields';
import { formatCurrencyInput } from '@/lib/utils';
import type { GoalFormData } from '@/lib/validations';
import type { GoalSourceType } from '@/types/Goal';

type Props = {
  form: UseFormReturn<GoalFormData>;
  sourceType: GoalSourceType;
};

const GoalFormFields = ({ form, sourceType }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 pb-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <Label>{t('goals.nameLabel')}</Label>
            <FormControl>
              <Input placeholder={t('goals.namePlaceholder')} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="target_amount"
        render={({ field }) => (
          <FormItem>
            <Label>{t('goals.targetLabel')}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
              <FormControl>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder={t('common.amountZero')}
                  {...field}
                  onChange={(e) => {
                    const formatted = formatCurrencyInput(e.target.value);
                    field.onChange(formatted);
                  }}
                  className="pl-7"
                />
              </FormControl>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <GoalSourceFields form={form} sourceType={sourceType} />

      <FormField
        control={form.control}
        name="deadline"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <Label>{t('goals.deadlineFieldLabel')}</Label>
            <DatePickerField
              value={field.value}
              onChange={field.onChange}
              placeholder={t('goals.noDeadline')}
              disabled={isDeadlineDisabled}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="color"
        render={({ field }) => (
          <FormItem>
            <Label>{t('goals.colorLabel')}</Label>
            <FormControl>
              <CategoryColorPicker
                value={field.value}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default GoalFormFields;

// --- Helpers ---

const isDeadlineDisabled = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date < today;
};
