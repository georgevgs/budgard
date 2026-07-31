import { useTranslation } from 'react-i18next';
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDialogDirty } from '@/hooks/useDialogDirty';
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
import DebtIdentityFields from '@/components/debts/DebtIdentityFields';
import DebtNumbersFields from '@/components/debts/DebtNumbersFields';
import { useDataConfig } from '@/contexts/DataContext';
import { useDebtSubmit } from '@/hooks/debts/useDebtSubmit';
import { getCurrencySymbol } from '@/lib/currencies';
import { formatCurrencyInput } from '@/lib/utils';
import { debtSchema, type DebtFormData } from '@/lib/validations';
import { type Debt } from '@/types/Debt';

const DEFAULT_COLOR = '#f97316';
const DEFAULT_ICON = 'credit-card';

type Props = {
  debt?: Debt;
  onClose: () => void;
}

const DebtForm = ({ debt, onClose }: Props) => {
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
            <DialogHeader className="pb-4" data-draggable-area>
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

          <div className="flex gap-3 justify-end px-4 sm:px-6 py-3 border-t border-border/50 shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
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

const resolveCurrencyDefault = (value: number | undefined): string => {
  if (value === undefined) {
    return '';
  }

  return formatCurrencyInput(value.toString().replace('.', ','));
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
}
