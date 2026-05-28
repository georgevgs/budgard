import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { parseISO } from 'date-fns';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import {
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { Label } from '@/components/ui/label';
import {
  Form,
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
import { useAuth } from '@/hooks/useAuth';
import { formatCurrencyInput } from '@/lib/utils';
import {
  recurringExpenseSchema,
  type RecurringExpenseFormData,
} from '@/lib/validations';
import type { RecurringExpense } from '@/types/RecurringExpense';
import type { Category } from '@/types/Category';
import type { Account } from '@/types/Account';
import { useTranslation } from 'react-i18next';

const frequencyValues = [
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
] as const;

type RecurringExpenseFormProps = {
  expense?: RecurringExpense;
  categories: Category[];
  investmentAccounts?: Account[];
  type?: 'expense' | 'income';
  onSubmit: (values: RecurringExpenseFormData) => Promise<void>;
  onClose: () => void;
};

const RecurringExpenseForm = ({
  expense,
  categories,
  investmentAccounts = [],
  type = 'expense',
  onSubmit,
  onClose,
}: RecurringExpenseFormProps) => {
  const { session } = useAuth();
  const { t } = useTranslation();

  const form = useForm<RecurringExpenseFormData>({
    resolver: zodResolver(recurringExpenseSchema),
    defaultValues: {
      amount: resolveAmountDefault(expense),
      description: expense?.description ?? '',
      category_id: expense?.category_id ?? 'none',
      frequency: expense?.frequency ?? 'monthly',
      start_date: resolveStartDate(expense),
      end_date: expense?.end_date ? parseISO(expense.end_date) : undefined,
      linked_account_id: expense?.linked_account_id ?? null,
    },
  });

  const isExpense = type === 'expense';
  const showLinkedAccount = isExpense && investmentAccounts.length > 0;

  const isStartDateDisabled = (date: Date) => {
    if (expense) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return date < today;
  };

  const isEndDateDisabled = (date: Date) => date < form.getValues('start_date');

  const handleSubmit = async (values: RecurringExpenseFormData) => {
    if (!session?.user?.id) return;
    await onSubmit(values);
  };

  const isIncome = type === 'income';
  const titleSuffix = getTitleSuffix(isIncome, t);
  const formTitle = getFormTitle(Boolean(expense), titleSuffix, t);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex justify-center pt-3 pb-2 sm:hidden" data-drag-handle>
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
      </div>

      <div
        className="overflow-y-auto flex-1 px-4 sm:px-6 overscroll-contain"
        style={{ touchAction: 'pan-y' }}
      >
        <DialogHeader className="pb-4" data-draggable-area>
          <DialogTitle className="text-xl">{formTitle}</DialogTitle>
          <DialogDescription>
            {t('recurring.formDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 pb-4"
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <Label>{t('recurring.amount')}</Label>
                  <FormControl>
                    <CurrencyInput
                      currency="EUR"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder={t('common.amountZero')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <Label>{t('recurring.description')}</Label>
                  <FormControl>
                    <Input
                      placeholder={t('recurring.descriptionPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <Label>{t('recurring.category')}</Label>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('recurring.selectCategory')}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">
                        {t('recurring.noCategory')}
                      </SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            {renderCategoryIcon(category)}
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <Label>{t('recurring.frequency')}</Label>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('recurring.selectFrequency')}
                        />
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

            <div className="flex justify-end gap-2 pt-4 pb-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {renderSubmitLabel(
                  form.formState.isSubmitting,
                  Boolean(expense),
                  t,
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default RecurringExpenseForm;

// ─── Helper render functions ──────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const getTitleSuffix = (isIncome: boolean, t: TranslateFunction): string => {
  if (isIncome) {
    return t('recurring.income.suffix');
  }

  return t('recurring.expensesTitle');
};

const getFormTitle = (
  isEditing: boolean,
  titleSuffix: string,
  t: TranslateFunction,
): string => {
  if (isEditing) {
    return `${t('recurring.formEdit')} — ${titleSuffix}`;
  }

  return `${t('recurring.formAdd')} — ${titleSuffix}`;
};

const resolveAmountDefault = (
  expense: RecurringExpense | undefined,
): string => {
  if (expense) {
    return formatCurrencyInput(expense.amount.toString().replace('.', ','));
  }

  return '';
};

const resolveStartDate = (expense: RecurringExpense | undefined): Date => {
  if (expense) {
    return parseISO(expense.start_date);
  }

  return new Date();
};

import type { UseFormReturn } from 'react-hook-form';

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

const renderCategoryIcon = (category: { icon?: string | null; color: string }) => {
  if (category.icon) {
    return <span className="text-sm">{category.icon}</span>;
  }

  return (
    <div
      className="w-3 h-3 rounded-full shrink-0"
      style={{ backgroundColor: category.color }}
    />
  );
};

const renderSubmitLabel = (
  isSubmitting: boolean,
  isEditing: boolean,
  t: TranslateFunction,
): ReactNode => {
  if (isSubmitting) {
    return (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        {t('common.saving')}
      </>
    );
  }

  if (isEditing) return t('recurring.update');

  return t('recurring.create');
};
