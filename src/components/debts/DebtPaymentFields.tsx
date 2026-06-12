import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import type { Locale } from 'date-fns';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DatePickerField } from '@/components/ui/date-picker-field';
import type { DebtPaymentFormData } from '@/lib/validations';

type Props = {
  form: UseFormReturn<DebtPaymentFormData>;
  currency: string;
  dateLocale: Locale | undefined;
};

const DebtPaymentFields = ({ form, currency, dateLocale }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 pb-4">
      <FormField
        control={form.control}
        name="amount"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <CurrencyInput
                currency={currency}
                value={field.value}
                onChange={field.onChange}
                placeholder={t('debts.payment.amountPlaceholder')}
                aria-label={t('debts.payment.amountLabel')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <DatePickerField
              value={field.value}
              onChange={field.onChange}
              placeholder={t('debts.payment.pickDate')}
              locale={dateLocale}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                {...field}
                placeholder={t('debts.payment.descriptionPlaceholder')}
                autoComplete="off"
                aria-label={t('debts.payment.descriptionLabel')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default DebtPaymentFields;
