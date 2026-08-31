import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import TransactionAmountControl from '@/components/common/TransactionAmountControl';
import type { CurrencyConversionApi } from '@/hooks/expenseForm/useCurrencyConversion';
import type { ExpenseFormData } from '@/lib/validations';

type Props = {
  form: UseFormReturn<ExpenseFormData>;
  conversion: CurrencyConversionApi;
};

const ExpenseAmountField = ({ form, conversion }: Props) => {
  const { t } = useTranslation();

  return (
    <FormField
      control={form.control}
      name="amount"
      render={({ field }) => (
        <FormItem>
          <TransactionAmountControl
            amountLabel={t('expenses.amountLabel')}
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

export default ExpenseAmountField;
