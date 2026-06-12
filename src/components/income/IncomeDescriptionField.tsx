import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { IncomeFormData } from '@/lib/validations';

type Props = {
  form: UseFormReturn<IncomeFormData>;
};

const IncomeDescriptionField = ({ form }: Props) => {
  const { t } = useTranslation();

  return (
    <FormField
      control={form.control}
      name="description"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Input
              placeholder={t('income.descriptionPlaceholder')}
              {...field}
              autoComplete="off"
              aria-label={t('income.descriptionLabel')}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default IncomeDescriptionField;
