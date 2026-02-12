import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addWeeks, addMonths, addYears } from 'date-fns';
import { CalendarIcon, Info } from 'lucide-react';
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
import { cn, formatCurrencyInput, formatCurrency, parseCurrencyInput } from '@/lib/utils';
import {
  recurringExpenseSchema,
  type RecurringExpenseFormData,
} from '@/lib/validations';
import type { RecurringExpense, RecurringExpenseFrequency } from '@/types/RecurringExpense';
import type { Category } from '@/types/Category';

const frequencies = [
  { value: 'weekly', label: 'Weekly', description: 'Every 7 days' },
  { value: 'biweekly', label: 'Every 2 weeks', description: 'Every 14 days' },
  { value: 'monthly', label: 'Monthly', description: 'Same day each month' },
  { value: 'quarterly', label: 'Quarterly', description: 'Every 3 months' },
  { value: 'yearly', label: 'Yearly', description: 'Once a year' },
];

// Calculate estimated monthly cost
function getMonthlyEstimate(amount: number, frequency: RecurringExpenseFrequency): number {
  switch (frequency) {
    case 'weekly':
      return amount * 4.33;
    case 'biweekly':
      return amount * 2.17;
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

// Calculate next occurrence after a date
function getNextOccurrence(startDate: Date, frequency: RecurringExpenseFrequency): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // If start date is in the future, that's the first occurrence
  if (startDate >= today) {
    return startDate;
  }

  // Otherwise calculate next occurrence from start date
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

interface RecurringExpenseFormProps {
  expense?: RecurringExpense;
  categories: Category[];
  onSubmit: (values: RecurringExpenseFormData) => Promise<void>;
  onClose: () => void;
}

const RecurringExpenseForm = ({
  expense,
  categories,
  onSubmit,
  onClose,
}: RecurringExpenseFormProps) => {
  const { session } = useAuth();

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

  // Watch form values for preview
  const watchedAmount = useWatch({ control: form.control, name: 'amount' });
  const watchedFrequency = useWatch({ control: form.control, name: 'frequency' });
  const watchedStartDate = useWatch({ control: form.control, name: 'start_date' });

  // Calculate preview values
  const parsedAmount = watchedAmount ? parseCurrencyInput(watchedAmount) : 0;
  const monthlyEstimate = parsedAmount > 0 && watchedFrequency
    ? getMonthlyEstimate(parsedAmount, watchedFrequency)
    : 0;
  const nextOccurrence = watchedStartDate && watchedFrequency
    ? getNextOccurrence(watchedStartDate, watchedFrequency)
    : null;

  const handleSubmit = async (values: RecurringExpenseFormData) => {
    if (!session?.user?.id) return;
    await onSubmit(values);
  };

  return (
    <div className="flex flex-col max-h-full">
      {/* Mobile drag handle */}
      <div className="flex justify-center pt-3 pb-2 sm:hidden">
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto flex-1 px-4 sm:px-6 overscroll-contain" style={{ touchAction: 'pan-y' }}>
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl">
            {expense ? 'Edit' : 'Add'} Recurring Expense
          </DialogTitle>
          <DialogDescription>
            Set up an expense that will automatically repeat based on the
            frequency you choose.
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
                <Label>Amount</Label>
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
                <Label>Description</Label>
                <FormControl>
                  <Input placeholder="e.g., Netflix subscription" {...field} />
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
                <Label>Category</Label>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
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
                <Label>Frequency</Label>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {frequencies.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        <div className="flex flex-col">
                          <span>{freq.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {freq.description}
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

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <Label>Start date</Label>
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
                          {field.value ? (
                            format(field.value, 'MMM d, yyyy')
                          ) : (
                            <span>Pick a date</span>
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
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          // Only disable dates before today when creating new recurring expense
                          return !expense && date < today;
                        }}
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
                  <Label>End date (optional)</Label>
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
                          {field.value ? (
                            format(field.value, 'MMM d, yyyy')
                          ) : (
                            <span>No end date</span>
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
                        disabled={(date) => date < form.getValues('start_date')}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Preview section */}
          {parsedAmount > 0 && watchedFrequency && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                <span>Preview</span>
              </div>
              <div className="text-foreground">
                {nextOccurrence && (
                  <p>
                    First expense: <strong>{format(nextOccurrence, 'MMM d, yyyy')}</strong>
                  </p>
                )}
                {monthlyEstimate > 0 && watchedFrequency !== 'monthly' && (
                  <p className="text-muted-foreground">
                    ~{formatCurrency(monthlyEstimate)}/month
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 pb-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? 'Saving...'
                : expense
                  ? 'Update'
                  : 'Create'}
            </Button>
          </div>
        </form>
      </Form>
      </div>
    </div>
  );
};

export default RecurringExpenseForm;
