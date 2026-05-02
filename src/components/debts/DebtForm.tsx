import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CategoryColorPicker from '@/components/categories/CategoryColorPicker';
import { useAuth } from '@/contexts/AuthContext';
import { useDataConfig } from '@/contexts/DataContext';
import { useDataOperations } from '@/hooks/useDataOperations';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '@/lib/currencies';
import {
  formatCurrencyInput,
  parseCurrencyInput,
} from '@/lib/utils';
import { debtSchema, type DebtFormData } from '@/lib/validations';
import { type Debt, DEBT_KINDS } from '@/types/Debt';

const DEFAULT_COLOR = '#f97316';
const DEFAULT_ICON = 'credit-card';

type Props = {
  debt?: Debt;
  onClose: () => void;
}

const DebtForm = ({ debt, onClose }: Props) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { defaultCurrency } = useDataConfig();
  const { handleDebtSubmit } = useDataOperations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(debt);

  const form = useForm<DebtFormData>({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      name: debt?.name ?? '',
      kind: debt?.kind ?? 'credit_card',
      currency: debt?.currency ?? defaultCurrency,
      current_balance: debt
        ? formatCurrencyInput(debt.current_balance.toString().replace('.', ','))
        : '',
      apr: debt ? debt.apr.toString() : '',
      minimum_payment: debt
        ? formatCurrencyInput(debt.minimum_payment.toString().replace('.', ','))
        : '',
      icon: debt?.icon ?? DEFAULT_ICON,
      color: debt?.color ?? DEFAULT_COLOR,
    },
  });

  const selectedCurrency = form.watch('currency');

  const handleSubmit = async (values: DebtFormData) => {
    if (!session?.user?.id) return;

    setIsSubmitting(true);
    try {
      const balance = parseCurrencyInput(values.current_balance);
      const minPayment = parseCurrencyInput(values.minimum_payment);
      const apr = Number(values.apr.replace(',', '.'));

      if (isEditing && debt) {
        await handleDebtSubmit(
          {
            name: values.name,
            kind: values.kind,
            currency: values.currency,
            apr,
            minimum_payment: minPayment,
            icon: values.icon,
            color: values.color,
          },
          debt.id,
        );
        onClose();
        return;
      }

      await handleDebtSubmit({
        name: values.name,
        kind: values.kind,
        currency: values.currency,
        current_balance: balance,
        apr,
        minimum_payment: minPayment,
        icon: values.icon,
        color: values.color,
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
                {renderFormTitle(isEditing, t)}
              </DialogTitle>
              <DialogDescription>
                {t('debts.formDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pb-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('debts.form.namePlaceholder')}
                        autoComplete="off"
                        aria-label={t('debts.form.nameLabel')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger aria-label={t('debts.form.kindLabel')}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEBT_KINDS.map((k) => (
                            <SelectItem key={k} value={k}>
                              {t(`debts.kind.${k}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          aria-label={t('debts.form.currencyLabel')}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {SUPPORTED_CURRENCIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.code} — {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {renderBalanceField(form, isEditing, selectedCurrency, t)}

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="apr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        {t('debts.form.aprLabel')}
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9.,]*"
                            placeholder={t('common.percentZero')}
                            {...field}
                            className="pr-7"
                          />
                        </FormControl>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          %
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minimum_payment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        {t('debts.form.minPaymentLabel')}
                      </FormLabel>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {getCurrencySymbol(selectedCurrency)}
                        </span>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9,.]*"
                            placeholder={t('common.amountZero')}
                            value={field.value}
                            onChange={(e) =>
                              field.onChange(
                                formatCurrencyInput(e.target.value),
                              )
                            }
                            className="pl-7"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <CategoryColorPicker
                        value={field.value}
                        onChange={field.onChange}
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

export default DebtForm;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

import type { UseFormReturn } from 'react-hook-form';

const renderFormTitle = (isEditing: boolean, t: TranslateFunction) => {
  if (isEditing) return t('debts.form.editTitle');

  return t('debts.form.addTitle');
};

const renderSubmitLabel = (isSubmitting: boolean, t: TranslateFunction) => {
  if (isSubmitting) return t('common.saving');

  return t('debts.form.save');
};

const renderBalanceField = (
  form: UseFormReturn<DebtFormData>,
  isEditing: boolean,
  currency: string,
  t: TranslateFunction,
) => {
  if (isEditing) return null;

  return (
    <FormField
      control={form.control}
      name="current_balance"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs text-muted-foreground">
            {t('debts.form.currentBalanceLabel')}
          </FormLabel>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {getCurrencySymbol(currency)}
            </span>
            <FormControl>
              <Input
                type="text"
                inputMode="decimal"
                pattern="[0-9,.]*"
                placeholder={t('debts.form.currentBalancePlaceholder')}
                value={field.value}
                onChange={(e) =>
                  field.onChange(formatCurrencyInput(e.target.value))
                }
                className="pl-7"
                aria-label={t('debts.form.currentBalanceLabel')}
              />
            </FormControl>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('debts.form.currentBalanceHint')}
          </p>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
