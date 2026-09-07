import { useTranslation } from 'react-i18next';
import { FormControl, FormLabel } from '@/common/ui/form';
import type { TranslateFunction } from '@/constants/translate';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/ui/select';
import { CurrencyInput } from '@/common/ui/currency-input';
import { SUPPORTED_CURRENCIES } from '@/constants/currencies';
import { formatCurrency } from '@/constants/utils';
import type { UseCurrencyConversionCoreReturn } from '@/common/hooks/currency/useCurrencyConversionCore';

type TransactionAmountControlProps = {
  amountLabel: string;
  conversion: UseCurrencyConversionCoreReturn;
  value: string;
  onChange: (value: string) => void;
};

export const TransactionAmountControl = ({
  amountLabel,
  conversion,
  value,
  onChange,
}: TransactionAmountControlProps) => {
  const { t } = useTranslation();

  return (
    <>
      <FormLabel>{amountLabel}</FormLabel>
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
            {SUPPORTED_CURRENCIES.map((currency) => (
              <SelectItem key={currency.code} value={currency.code}>
                {currency.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormControl>
          <CurrencyInput
            currency={conversion.selectedCurrency}
            value={value}
            onChange={onChange}
            placeholder={t('expenses.amountPlaceholder')}
            wrapperClassName="flex-1"
          />
        </FormControl>
      </div>
      {renderConversionPreview(conversion, t)}
    </>
  );
};

const renderConversionPreview = (
  conversion: UseCurrencyConversionCoreReturn,
  t: TranslateFunction,
) => {
  if (conversion.selectedCurrency === conversion.defaultCurrency) return null;

  if (conversion.isFetchingRate) {
    return (
      <p className="text-xs text-muted-foreground mt-1">
        {t('expenses.currency.fetchingRate')}
      </p>
    );
  }

  if (conversion.hasRateError) {
    return (
      <p className="text-xs text-destructive-ink mt-1">
        {t('expenses.currency.rateError')}
      </p>
    );
  }

  if (!conversion.previewConvertedAmount) return null;

  return (
    <p className="text-xs text-muted-foreground mt-1">
      {t('expenses.currency.convertedAmount', {
        amount: formatCurrency(
          conversion.previewConvertedAmount,
          conversion.defaultCurrency,
        ),
      })}
    </p>
  );
};
