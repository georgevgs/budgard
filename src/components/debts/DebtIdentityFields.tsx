import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
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
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import type { DebtFormData } from '@/lib/validations';
import { DEBT_KINDS } from '@/types/Debt';

type Props = {
  form: UseFormReturn<DebtFormData>;
};

const DebtIdentityFields = ({ form }: Props) => {
  const { t } = useTranslation();

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                {...field}
                placeholder={t('debts.form.namePlaceholder')}
                autoComplete="off"
                aria-label={t('debts.form.nameLabel')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="kind"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label={t('debts.form.kindLabel')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEBT_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {t(`debts.kind.${k}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="currency"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label={t('debts.form.currencyLabel')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

export default DebtIdentityFields;
