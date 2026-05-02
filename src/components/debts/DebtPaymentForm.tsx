import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import {
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
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
import CalendarIcon from 'lucide-react/dist/esm/icons/calendar';
import { useAuth } from '@/contexts/AuthContext';
import { useDataOperations } from '@/hooks/useDataOperations';
import {
  cn,
  formatCurrencyInput,
  parseCurrencyInput,
} from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';
import {
  debtPaymentSchema,
  type DebtPaymentFormData,
} from '@/lib/validations';
import type { Debt } from '@/types/Debt';

type Props = {
  debt: Debt;
  onClose: () => void;
}

const DebtPaymentForm = ({ debt, onClose }: Props) => {
  const { t, i18n } = useTranslation();
  const dateLocale: Locale = i18n.language === 'el' ? el : enUS;
  const { session } = useAuth();
  const { handleExpenseSubmit } = useDataOperations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const suggested = debt.minimum_payment > 0
    ? formatCurrencyInput(debt.minimum_payment.toString().replace('.', ','))
    : '';

  const form = useForm<DebtPaymentFormData>({
    resolver: zodResolver(debtPaymentSchema),
    defaultValues: {
      amount: suggested,
      date: new Date(),
      description: '',
    },
  });

  const handleSubmit = async (values: DebtPaymentFormData) => {
    if (!session?.user?.id) return;

    setIsSubmitting(true);
    try {
      const amount = parseCurrencyInput(values.amount);
      const date = format(values.date, 'yyyy-MM-dd');
      const description = values.description?.trim() || debt.name;

      await handleExpenseSubmit({
        amount,
        date,
        description,
        debt_id: debt.id,
        user_id: session.user.id,
      });
      onClose();
    } catch {
      // toast already shown
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="flex justify-center pt-3 pb-2 sm:hidden shrink-0"
        data-drag-handle
      >
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col flex-1 min-h-0"
        >
          <div
            className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 overscroll-contain"
            style={{ touchAction: 'pan-y' }}
          >
            <DialogHeader className="pb-4" data-draggable-area>
              <DialogTitle className="text-xl">
                {t('debts.payment.title', { name: debt.name })}
              </DialogTitle>
              <DialogDescription>
                {t('debts.payment.description')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pb-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {getCurrencySymbol(debt.currency)}
                      </span>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9,.]*"
                          placeholder={t('debts.payment.amountPlaceholder')}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(formatCurrencyInput(e.target.value))
                          }
                          className="pl-7"
                          aria-label={t('debts.payment.amountLabel')}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <Popover modal={false}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground',
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {renderDateLabel(field.value, dateLocale, t)}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={dateLocale}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('debts.payment.descriptionPlaceholder')}
                        autoComplete="off"
                        aria-label={t('debts.payment.descriptionLabel')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end px-4 sm:px-6 py-3 border-t border-border/50 shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {renderSubmitLabel(isSubmitting, t)}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderDateLabel = (
  value: Date | undefined,
  locale: Locale,
  t: TranslateFunction,
) => {
  if (!value) return t('debts.payment.pickDate');

  return format(value, 'PPP', { locale });
};

const renderSubmitLabel = (isSubmitting: boolean, t: TranslateFunction) => {
  if (isSubmitting) return t('common.saving');

  return t('debts.payment.save');
};

export default DebtPaymentForm;
