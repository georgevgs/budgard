import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/common/ui/form';
import { Input } from '@/common/ui/input';
import type { IncomeFormData } from '@/pages/income/validations';

type IncomeDescriptionFieldProps = {
  form: UseFormReturn<IncomeFormData>;
};

export const IncomeDescriptionField = ({ form }: IncomeDescriptionFieldProps) => {
  const { t } = useTranslation();

  return (
    <FormField
      control={form.control}
      name="description"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('income.descriptionLabel')}</FormLabel>
          <FormControl>
            <Input
              placeholder={t('income.descriptionPlaceholder')}
              {...field}
              autoComplete="off"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
