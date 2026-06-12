import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import type { Locale } from 'date-fns';
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import { DatePickerField } from '@/components/ui/date-picker-field';
import type { ExpenseFormData } from '@/lib/validations';

type Props = {
  form: UseFormReturn<ExpenseFormData>;
  dateLocale: Locale | undefined;
};

const ExpenseDateField = ({ form, dateLocale }: Props) => {
  const { t } = useTranslation();

  return (
    <FormField
      control={form.control}
      name="date"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <DatePickerField
            value={field.value}
            onChange={field.onChange}
            placeholder={t('expenses.pickDate')}
            locale={dateLocale}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ExpenseDateField;
