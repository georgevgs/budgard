import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDialogDirty } from '@/hooks/useDialogDirty';
import { format } from 'date-fns';
import {
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { useExpenseOps } from '@/hooks/dataOps/useExpenseOps';
import { useDateLocale } from '@/hooks/useDateLocale';
import { amountToInput, parseCurrencyInput } from '@/lib/utils';
import DebtPaymentFields from '@/components/debts/DebtPaymentFields';
import { debtPaymentSchema, type DebtPaymentFormData } from '@/lib/validations';
import type { Debt } from '@/types/Debt';

type Props = {
  debt: Debt;
  onClose: () => void;
};

const DebtPaymentForm = ({ debt, onClose }: Props) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { session } = useAuth();
  const { handleExpenseSubmit } = useExpenseOps();
  const [isSubmitting, setIsSubmitting] = useState(false);

  let suggested = '';
  if (debt.minimum_payment > 0) {
    suggested = amountToInput(debt.minimum_payment, debt.currency);
  }

  const form = useForm<DebtPaymentFormData>({
    resolver: zodResolver(debtPaymentSchema),
    mode: 'onTouched',
    defaultValues: {
      amount: suggested,
      date: new Date(),
      description: '',
    },
  });

  useDialogDirty(form.formState.isDirty);

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
            <DialogHeader className="pb-4 pr-10" data-draggable-area>
              <DialogTitle className="text-xl">
                {t('debts.payment.title', { name: debt.name })}
              </DialogTitle>
              <DialogDescription>
                {t('debts.payment.description')}
              </DialogDescription>
            </DialogHeader>

            <DebtPaymentFields
              form={form}
              currency={debt.currency}
              dateLocale={dateLocale}
            />
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-border/50 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !form.formState.isValid}
            >
              {renderSubmitLabel(isSubmitting, t)}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};

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
