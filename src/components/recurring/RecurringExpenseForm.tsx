import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import CalendarIcon from 'lucide-react/dist/esm/icons/calendar';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import {
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { cn, formatCurrencyInput } from '@/lib/utils';
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

export type RecurringExpensePrefill = {
  description?: string;
  amount?: number;
  frequency?: RecurringExpense['frequency'];
  category_id?: string | null;
};

type RecurringExpenseFormProps = {
  expense?: RecurringExpense;
  prefill?: RecurringExpensePrefill;
  categories: Category[];
  investmentAccounts?: Account[];
  type?: 'expense' | 'income';
  onSubmit: (values: RecurringExpenseFormData) => Promise<void>;
  onClose: () => void;
};

const RecurringExpenseForm = ({
  expense,
  prefill,
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
      amount: resolveAmountDefault(expense, prefill),
      description: expense?.description ?? prefill?.description ?? '',
      category_id:
        expense?.category_id ?? prefill?.category_id ?? 'none',
      frequency: expense?.frequency ?? prefill?.frequency ?? 'monthly',
      start_date: expense ? parseISO(expense.start_date) : new Date(),
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
  const titleSuffix = isIncome
    ? t('recurring.income.suffix')
    : t('recurring.expensesTitle');
  const formTitle = expense
    ? `${t('recurring.formEdit')} — ${titleSuffix}`
    : `${t('recurring.formAdd')} — ${titleSuffix}`;

  return (
    <div className="flex flex-col max-h-full">
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
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      €
                    </span>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder={t('common.amountZero')}
                        {...field}
                        onChange={(e) => {
                          const formatted = formatCurrencyInput(e.target.value);
                          field.onChange(formatted);
                        }}
                        className="pl-7"
                      />
                    </FormControl>
                  </div>
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
                    <Popover modal={false}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground',
                            )}
                          >
                            {renderDateValue(
                              field.value,
                              t('recurring.pickDate'),
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={isStartDateDisabled}
                        />
                      </PopoverContent>
                    </Popover>
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
                    <Popover modal={false}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground',
                            )}
                          >
                            {renderDateValue(
                              field.value,
                              t('recurring.noEndDate'),
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={isEndDateDisabled}
                        />
                      </PopoverContent>
                    </Popover>
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

const resolveAmountDefault = (
  expense: RecurringExpense | undefined,
  prefill: RecurringExpensePrefill | undefined,
): string => {
  if (expense) {
    return formatCurrencyInput(expense.amount.toString().replace('.', ','));
  }

  if (prefill?.amount !== undefined) {
    return formatCurrencyInput(prefill.amount.toString().replace('.', ','));
  }

  return '';
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

const renderDateValue = (date: Date | undefined, placeholder: string) => {
  if (!date) return <span>{placeholder}</span>;

  return format(date, 'MMM d, yyyy');
};

const renderSubmitLabel = (
  isSubmitting: boolean,
  isEditing: boolean,
  t: TranslateFunction,
): ReactNode => {
  if (isSubmitting) {
    return (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('common.saving')}
      </>
    );
  }

  if (isEditing) return t('recurring.update');

  return t('recurring.create');
};
