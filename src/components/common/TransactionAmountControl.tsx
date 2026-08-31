import { useTranslation } from 'react-i18next';
import { FormControl } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { formatCurrency } from '@/lib/utils';
import type { CurrencyConversionApi } from '@/hooks/currency/useCurrencyConversionCore';

type Props = {
  amountLabel: string;
  conversion: CurrencyConversionApi;
  value: string;
  onChange: (value: string) => void;
};

const TransactionAmountControl = ({
  amountLabel,
  conversion,
  value,
  onChange,
}: Props) => {
  const { t } = useTranslation();

  return (
    <>
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
            aria-label={amountLabel}
            wrapperClassName="flex-1"
          />
        </FormControl>
      </div>
      {renderConversionPreview(conversion, t)}
    </>
  );
};

export default TransactionAmountControl;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderConversionPreview = (
  conversion: CurrencyConversionApi,
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
