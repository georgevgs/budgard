import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import type { Locale } from 'date-fns';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/common/ui/form';
import { DatePickerField } from '@/common/ui/date-picker-field';
import type { IncomeFormData } from '@/constants/validations';

type Props = {
  form: UseFormReturn<IncomeFormData>;
  dateLocale: Locale | undefined;
};

const IncomeDateField = ({ form, dateLocale }: Props) => {
  const { t } = useTranslation();

  return (
    <FormField
      control={form.control}
      name="date"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{t('expenses.date')}</FormLabel>
          <FormControl>
            <DatePickerField
              value={field.value}
              onChange={field.onChange}
              placeholder={t('expenses.pickDate')}
              locale={dateLocale}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default IncomeDateField;
