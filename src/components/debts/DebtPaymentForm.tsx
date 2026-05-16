import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import {
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { useExpenseOps } from '@/hooks/dataOps/useExpenseOps';
import { useDateLocale } from '@/hooks/useDateLocale';
import {
  formatCurrencyInput,
  parseCurrencyInput,
} from '@/lib/utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DatePickerField } from '@/components/ui/date-picker-field';
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
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { session } = useAuth();
  const { handleExpenseSubmit } = useExpenseOps();
  const [isSubmitting, setIsSubmitting] = useState(false);

  let suggested = '';
  if (debt.minimum_payment > 0) {
    suggested = formatCurrencyInput(
      debt.minimum_payment.toString().replace('.', ','),
    );
  }

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
        type: 'debt_payment',
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
                    <FormControl>
                      <CurrencyInput
                        currency={debt.currency}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t('debts.payment.amountPlaceholder')}
                        aria-label={t('debts.payment.amountLabel')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <DatePickerField
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t('debts.payment.pickDate')}
                      locale={dateLocale}
                    />
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

const renderSubmitLabel = (isSubmitting: boolean, t: TranslateFunction) => {
  if (isSubmitting) return t('common.saving');

  return t('debts.payment.save');
};

export default DebtPaymentForm;
