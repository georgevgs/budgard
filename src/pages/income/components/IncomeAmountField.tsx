import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormMessage } from '@/common/ui/form';
import TransactionAmountControl from '@/common/components/common/TransactionAmountControl';
import type { CurrencyConversionApi } from '@/common/hooks/currency/useCurrencyConversionCore';
import type { IncomeFormData } from '@/constants/validations';

interface Props {
  form: UseFormReturn<IncomeFormData>;
  conversion: CurrencyConversionApi;
}

const IncomeAmountField = ({ form, conversion }: Props) => {
  const { t } = useTranslation();

  return (
    <FormField
      control={form.control}
      name="amount"
      render={({ field }) => (
        <FormItem>
          <TransactionAmountControl
            amountLabel={t('income.amountLabel')}
            conversion={conversion}
            value={field.value}
            onChange={field.onChange}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default IncomeAmountField;
