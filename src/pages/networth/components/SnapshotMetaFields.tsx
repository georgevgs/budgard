import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import type { Locale } from 'date-fns';
import { Input } from '@/common/ui/input';
import { DatePickerField } from '@/common/ui/date-picker-field';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/common/ui/form';
import type { AccountBalanceFormData } from '@/pages/networth/validations';

interface Props {
  form: UseFormReturn<AccountBalanceFormData>;
  dateLocale: Locale | undefined;
}

const SnapshotMetaFields = ({ form, dateLocale }: Props) => {
  const { t } = useTranslation();

  return (
    <>
      <FormField
        control={form.control}
        name="recorded_at"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <DatePickerField
              value={field.value}
              onChange={field.onChange}
              placeholder={t('networth.snapshot.pickDate')}
              locale={dateLocale}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="note"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                {...field}
                placeholder={t('networth.snapshot.notePlaceholder')}
                autoComplete="off"
                aria-label={t('networth.snapshot.noteLabel')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

export default SnapshotMetaFields;
