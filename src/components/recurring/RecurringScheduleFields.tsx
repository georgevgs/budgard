import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { Label } from '@/components/ui/label';
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
import type { RecurringExpenseFormData } from '@/lib/validations';
import type { Account } from '@/types/Account';

const frequencyValues = [
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
] as const;

type Props = {
  form: UseFormReturn<RecurringExpenseFormData>;
  isEditing: boolean;
  showLinkedAccount: boolean;
  investmentAccounts: Account[];
};

const RecurringScheduleFields = ({
  form,
  isEditing,
  showLinkedAccount,
  investmentAccounts,
}: Props) => {
  const { t } = useTranslation();

  const isStartDateDisabled = (date: Date) => {
    if (isEditing) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return date < today;
  };

  const isEndDateDisabled = (date: Date) => date < form.getValues('start_date');

  return (
    <>
      <FormField
        control={form.control}
        name="frequency"
        render={({ field }) => (
          <FormItem>
            <Label>{t('recurring.frequency')}</Label>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('recurring.selectFrequency')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {frequencyValues.map((freq) => (
                  <SelectItem key={freq} value={freq}>
                    <div className="flex flex-col">
                      <span>{t(`recurring.frequencies.${freq}`)}</span>
                      <span className="text-xs text-muted-foreground">
                        {t(`recurring.frequencyDescriptions.${freq}`)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {renderLinkedAccountField(form, showLinkedAccount, investmentAccounts, t)}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="start_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <Label>{t('recurring.startDateLabel')}</Label>
              <DatePickerField
                value={field.value}
                onChange={field.onChange}
                placeholder={t('recurring.pickDate')}
                disabled={isStartDateDisabled}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="end_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <Label>{t('recurring.endDateLabel')}</Label>
              <DatePickerField
                value={field.value}
                onChange={field.onChange}
                placeholder={t('recurring.noEndDate')}
                disabled={isEndDateDisabled}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
};

export default RecurringScheduleFields;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const NO_LINKED_ACCOUNT = 'none';

const renderLinkedAccountField = (
  form: UseFormReturn<RecurringExpenseFormData>,
  show: boolean,
  accounts: Account[],
  t: TranslateFunction,
) => {
  if (!show) return null;

  return (
    <FormField
      control={form.control}
      name="linked_account_id"
      render={({ field }) => (
        <FormItem>
          <Label>{t('recurring.linkedAccountLabel')}</Label>
          <Select
            onValueChange={(value) => {
              if (value === NO_LINKED_ACCOUNT) {
                field.onChange(null);

                return;
              }
              field.onChange(value);
            }}
            defaultValue={field.value ?? NO_LINKED_ACCOUNT}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue
                  placeholder={t('recurring.linkedAccountPlaceholder')}
                />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={NO_LINKED_ACCOUNT}>
                {t('recurring.noLinkedAccount')}
              </SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t('recurring.linkedAccountHint')}
          </p>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
