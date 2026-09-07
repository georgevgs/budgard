import { useTranslation } from 'react-i18next';
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDialogDirty } from '@/common/hooks/useDialogDirty';
import type { TranslateFunction } from '@/constants/translate';
import {
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/common/ui/dialog';
import { Button } from '@/common/ui/button';
import { Input } from '@/common/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/common/ui/form';
import { DebtIdentityFields } from '@/pages/debts/components/DebtIdentityFields';
import { DebtNumbersFields } from '@/pages/debts/components/DebtNumbersFields';
import { useDataConfig } from '@/common/contexts/DataContext';
import { useDebtSubmit } from '@/pages/debts/hooks/useDebtSubmit';
import { getCurrencySymbol } from '@/constants/currencies';
import { amountToInput, formatCurrencyInput } from '@/constants/utils';
import { debtSchema, type DebtFormData } from '@/pages/debts/validations';
import { type Debt } from '@/types/Debt';
import { swatch } from '@/design/palette';

const DEFAULT_COLOR = swatch.rose;
const DEFAULT_ICON = 'credit-card';

type DebtFormProps = {
  debt?: Debt;
  onClose: () => void;
};

export const DebtForm = ({ debt, onClose }: DebtFormProps) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const isEditing = Boolean(debt);
  const { isSubmitting, handleSubmit } = useDebtSubmit({ debt, onClose });

  const form = useForm<DebtFormData>({
    resolver: zodResolver(debtSchema),
    mode: 'onTouched',
    defaultValues: {
      name: debt?.name ?? '',
      kind: debt?.kind ?? 'credit_card',
      currency: debt?.currency ?? defaultCurrency,
      current_balance: resolveCurrencyDefault(debt?.current_balance),
      apr: resolveAprDefault(debt),
      minimum_payment: resolveCurrencyDefault(debt?.minimum_payment),
      icon: debt?.icon ?? DEFAULT_ICON,
      color: debt?.color ?? DEFAULT_COLOR,
    },
  });

  useDialogDirty(form.formState.isDirty);

  const selectedCurrency = useWatch({
    control: form.control,
    name: 'currency',
  });

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
                {renderFormTitle(isEditing, t)}
              </DialogTitle>
              <DialogDescription>
                {t('debts.formDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pb-4">
              <DebtIdentityFields form={form} />

              {renderBalanceField(form, isEditing, selectedCurrency, t)}

              <DebtNumbersFields
                form={form}
                selectedCurrency={selectedCurrency}
              />
            </div>
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

const resolveCurrencyDefault = (value: number | undefined): string => {
  if (value === undefined) {
    return '';
  }

  return amountToInput(value);
};

const resolveAprDefault = (debt: Debt | undefined): string => {
  if (!debt) {
    return '';
  }

  return debt.apr.toString();
};

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
};
