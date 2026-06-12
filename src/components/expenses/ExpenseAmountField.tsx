import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
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
import { CurrencyInput } from '@/components/ui/currency-input';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { renderConversionPreview } from '@/components/expenses/ExpensesForm.helpers';
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
          <div className="flex gap-2">
            <Select
              value={conversion.selectedCurrency}
              onValueChange={conversion.handleCurrencyChange}
            >
              <SelectTrigger
                className="w-20 shrink-0"
                aria-label={t('expenses.currency.label')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {SUPPORTED_CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormControl>
              <CurrencyInput
                currency={conversion.selectedCurrency}
                value={field.value}
                onChange={field.onChange}
                placeholder={t('expenses.amountPlaceholder')}
                aria-label={t('expenses.amountLabel')}
                wrapperClassName="flex-1"
              />
            </FormControl>
          </div>
          {renderConversionPreview(
            conversion.isFetchingRate,
            conversion.hasRateError,
            conversion.previewConvertedAmount,
            conversion.selectedCurrency,
            conversion.defaultCurrency,
            t,
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ExpenseAmountField;
