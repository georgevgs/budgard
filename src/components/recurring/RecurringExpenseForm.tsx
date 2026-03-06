import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addWeeks, addMonths, addYears } from 'date-fns';
import CalendarIcon from 'lucide-react/dist/esm/icons/calendar';
import Info from 'lucide-react/dist/esm/icons/info';
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
import {
  cn,
  formatCurrencyInput,
  formatCurrency,
  parseCurrencyInput,
} from '@/lib/utils';
import {
  recurringExpenseSchema,
  type RecurringExpenseFormData,
} from '@/lib/validations';
import type {
  RecurringExpense,
  RecurringExpenseFrequency,
} from '@/types/RecurringExpense';
import type { Category } from '@/types/Category';
import { useTranslation } from 'react-i18next';

const WEEKS_PER_MONTH = 4.33;
const BIWEEKLY_PERIODS_PER_MONTH = 2.17;

const frequencyValues = [
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
] as const;

function getMonthlyEstimate(
  amount: number,
  frequency: RecurringExpenseFrequency,
): number {
  switch (frequency) {
    case 'weekly':
      return amount * WEEKS_PER_MONTH;
    case 'biweekly':
      return amount * BIWEEKLY_PERIODS_PER_MONTH;
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'yearly':
      return amount / 12;
    default:
      return amount;
  }
}

function getNextOccurrence(
  startDate: Date,
  frequency: RecurringExpenseFrequency,
): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate >= today) {
    return startDate;
  }

  let next = new Date(startDate);
  while (next < today) {
    switch (frequency) {
      case 'weekly':
        next = addWeeks(next, 1);
        break;
      case 'biweekly':
        next = addWeeks(next, 2);
        break;
      case 'monthly':
        next = addMonths(next, 1);
        break;
      case 'quarterly':
        next = addMonths(next, 3);
        break;
      case 'yearly':
        next = addYears(next, 1);
        break;
    }
  }
  return next;
}

type RecurringExpenseFormProps = {
  expense?: RecurringExpense;
  categories: Category[];
  onSubmit: (values: RecurringExpenseFormData) => Promise<void>;
  onClose: () => void;
};

const RecurringExpenseForm = ({
  expense,
  categories,
  onSubmit,
  onClose,
}: RecurringExpenseFormProps) => {
  const { session } = useAuth();
  const { t } = useTranslation();

  const form = useForm<RecurringExpenseFormData>({
    resolver: zodResolver(recurringExpenseSchema),
    defaultValues: {
      amount: expense
        ? formatCurrencyInput(expense.amount.toString().replace('.', ','))
        : '',
      description: expense?.description || '',
      category_id: expense?.category_id || 'none',
      frequency: expense?.frequency || 'monthly',
      start_date: expense ? new Date(expense.start_date) : new Date(),
      end_date: expense?.end_date ? new Date(expense.end_date) : undefined,
    },
  });

  const watchedAmount = useWatch({ control: form.control, name: 'amount' });
  const watchedFrequency = useWatch({
    control: form.control,
    name: 'frequency',
  });
  const watchedStartDate = useWatch({
    control: form.control,
    name: 'start_date',
  });

  const parsedAmount = watchedAmount ? parseCurrencyInput(watchedAmount) : 0;
  const monthlyEstimate =
    parsedAmount > 0 && watchedFrequency
      ? getMonthlyEstimate(parsedAmount, watchedFrequency)
      : 0;
  const nextOccurrence =
    watchedStartDate && watchedFrequency
      ? getNextOccurrence(watchedStartDate, watchedFrequency)
      : null;

  const isStartDateDisabled = (date: Date) => {
    if (expense) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isEndDateDisabled = (date: Date) =>
    date < form.getValues('start_date');

  const handleSubmit = async (values: RecurringExpenseFormData) => {
    if (!session?.user?.id) return;
    await onSubmit(values);
  };

  const formTitle = expense
    ? t('recurring.formTitle', { action: t('recurring.formEdit') })
    : t('recurring.formTitle', { action: t('recurring.formAdd') });

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
                        placeholder="0,00"
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
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
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
                            {renderDateValue(field.value, t('recurring.pickDate'))}
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

            {renderPreviewSection(
              parsedAmount,
              watchedFrequency,
              nextOccurrence,
              monthlyEstimate,
              t,
            )}

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

const renderDateValue = (date: Date | undefined, placeholder: string) => {
  if (!date) return <span>{placeholder}</span>;

  return format(date, 'MMM d, yyyy');
};

const renderSubmitLabel = (
  isSubmitting: boolean,
  isEditing: boolean,
  t: TranslateFunction,
) => {
  if (isSubmitting) return t('common.saving');
  if (isEditing) return t('recurring.update');

  return t('recurring.create');
};

const renderPreviewSection = (
  parsedAmount: number,
  watchedFrequency: RecurringExpenseFrequency | undefined,
  nextOccurrence: Date | null,
  monthlyEstimate: number,
  t: TranslateFunction,
) => {
  if (parsedAmount <= 0 || !watchedFrequency) return null;

  return (
    <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Info className="h-3.5 w-3.5" />
        <span>{t('recurring.preview')}</span>
      </div>
      <div className="text-foreground">
        {renderNextOccurrencePreview(nextOccurrence, t)}
        {renderMonthlyEstimatePreview(monthlyEstimate, watchedFrequency, t)}
      </div>
    </div>
  );
};

const renderNextOccurrencePreview = (
  nextOccurrence: Date | null,
  t: TranslateFunction,
) => {
  if (!nextOccurrence) return null;

  return (
    <p>
      {t('recurring.firstExpense', {
        date: format(nextOccurrence, 'MMM d, yyyy'),
      })}
    </p>
  );
};

const renderMonthlyEstimatePreview = (
  monthlyEstimate: number,
  watchedFrequency: RecurringExpenseFrequency,
  t: TranslateFunction,
) => {
  if (monthlyEstimate <= 0 || watchedFrequency === 'monthly') return null;

  return (
    <p className="text-muted-foreground">
      {t('recurring.perMonth', {
        amount: formatCurrency(monthlyEstimate),
      })}
    </p>
  );
};
