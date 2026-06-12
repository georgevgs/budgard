import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import CategoryColorPicker from '@/components/categories/CategoryColorPicker';
import { getCurrencySymbol } from '@/lib/currencies';
import { formatCurrencyInput } from '@/lib/utils';
import type { DebtFormData } from '@/lib/validations';

type Props = {
  form: UseFormReturn<DebtFormData>;
  selectedCurrency: string;
};

const DebtNumbersFields = ({ form, selectedCurrency }: Props) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="apr"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground">
                {t('debts.form.aprLabel')}
              </FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9.,]*"
                    placeholder={t('common.percentZero')}
                    {...field}
                    className="pr-7"
                  />
                </FormControl>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  %
                </span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="minimum_payment"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground">
                {t('debts.form.minPaymentLabel')}
              </FormLabel>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {getCurrencySymbol(selectedCurrency)}
                </span>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9,.]*"
                    placeholder={t('common.amountZero')}
                    value={field.value}
                    onChange={(e) =>
                      field.onChange(formatCurrencyInput(e.target.value))
                    }
                    className="pl-7"
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="color"
        render={({ field }) => (
          <FormItem>
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
    </>
  );
};

export default DebtNumbersFields;
