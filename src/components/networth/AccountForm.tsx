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
  FormMessage,
} from '@/components/ui/form';
import CategoryColorPicker from '@/components/categories/CategoryColorPicker';
import AccountIdentityFields from '@/components/networth/AccountIdentityFields';
import { useDataConfig } from '@/contexts/DataContext';
import { useAccountSubmit } from '@/hooks/networth/useAccountSubmit';
import { getCurrencySymbol } from '@/lib/currencies';
import { formatCurrencyInput } from '@/lib/utils';
import { accountSchema, type AccountFormData } from '@/lib/validations';
import type { Account, AccountKind } from '@/types/Account';

const DEFAULT_COLOR = '#00b8f5';

type Props = {
  account?: Account;
  onClose: () => void;
}

const AccountForm = ({ account, onClose }: Props) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const isEditing = Boolean(account);
  const { isSubmitting, handleSubmit } = useAccountSubmit({ account, onClose });

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    mode: 'onTouched',
    defaultValues: {
      name: account?.name ?? '',
      kind: account?.kind ?? 'bank',
      default_currency: account?.default_currency ?? defaultCurrency,
      initial_balance: resolveInitialBalance(account),
      color: account?.color ?? DEFAULT_COLOR,
    },
  });

  useDialogDirty(form.formState.isDirty);

  const selectedCurrency = useWatch({
    control: form.control,
    name: 'default_currency',
  });
  const selectedKind = useWatch({ control: form.control, name: 'kind' });

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
                {t('networth.formDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pb-4">
              <AccountIdentityFields form={form} />

              {renderInitialBalanceField(
                form,
                isEditing,
                selectedCurrency,
                selectedKind,
                t,
              )}

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
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
              {renderSubmitLabel(isSubmitting, t)}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}

export default AccountForm;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const resolveInitialBalance = (account: Account | undefined): string => {
  if (!account) {
    return '';
  }

  return formatCurrencyInput(
    account.current_balance.toString().replace('.', ','),
  );
};

const renderFormTitle = (isEditing: boolean, t: TranslateFunction) => {
  if (isEditing) return t('networth.form.editTitle');

  return t('networth.form.addTitle');
};

const renderSubmitLabel = (isSubmitting: boolean, t: TranslateFunction) => {
  if (isSubmitting) return t('common.saving');

  return t('networth.form.save');
};

const getInitialBalanceLabelKey = (selectedKind: AccountKind): string => {
  if (selectedKind === 'investment') {
    return 'networth.form.initialValueLabel';
  }

  return 'networth.form.initialBalanceLabel';
};

const renderInitialBalanceField = (
  form: UseFormReturn<AccountFormData>,
  isEditing: boolean,
  selectedCurrency: string,
  selectedKind: AccountKind,
  t: TranslateFunction,
) => {
  if (isEditing) return null;

  const labelKey = getInitialBalanceLabelKey(selectedKind);

  return (
    <FormField
      control={form.control}
      name="initial_balance"
      render={({ field }) => (
        <FormItem>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {getCurrencySymbol(selectedCurrency)}
            </span>
            <FormControl>
              <Input
                type="text"
                inputMode="decimal"
                pattern="[0-9,.]*"
                placeholder={t(labelKey)}
                value={field.value}
                onChange={(e) =>
                  field.onChange(formatCurrencyInput(e.target.value))
                }
                className="pl-7"
                aria-label={t(labelKey)}
              />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
