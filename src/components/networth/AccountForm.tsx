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
import { useAccountOps } from '@/hooks/dataOps/useAccountOps';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '@/lib/currencies';
import {
  formatCurrencyInput,
  parseCurrencyInput,
} from '@/lib/utils';
import { accountSchema, type AccountFormData } from '@/lib/validations';
import type { Account, AccountKind } from '@/types/Account';

const KINDS: ReadonlyArray<AccountKind> = [
  'bank',
  'cash',
  'credit_card',
  'loan',
  'investment',
  'other',
];

const DEFAULT_COLOR = '#f97316';

type Props = {
  account?: Account;
  onClose: () => void;
}

const AccountForm = ({ account, onClose }: Props) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { defaultCurrency } = useDataConfig();
  const { handleAccountSubmit } = useAccountOps();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(account);

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: account?.name ?? '',
      kind: account?.kind ?? 'bank',
      default_currency: account?.default_currency ?? defaultCurrency,
      initial_balance: account
        ? formatCurrencyInput(
            account.current_balance.toString().replace('.', ','),
          )
        : '',
      color: account?.color ?? DEFAULT_COLOR,
    },
  });

  const selectedCurrency = form.watch('default_currency');
  const selectedKind = form.watch('kind');

  const handleSubmit = async (values: AccountFormData) => {
    if (!session?.user?.id) return;

    setIsSubmitting(true);
    try {
      if (isEditing && account) {
        await handleAccountSubmit(
          {
            name: values.name,
            kind: values.kind,
            default_currency: values.default_currency,
            color: values.color,
          },
          account.id,
        );
        onClose();
        return;
      }

      await handleAccountSubmit({
        name: values.name,
        kind: values.kind,
        default_currency: values.default_currency,
        color: values.color,
        user_id: session.user.id,
        initial_balance: parseCurrencyInput(values.initial_balance),
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
                {t('networth.formDescription')}
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
                      placeholder={t('networth.form.namePlaceholder')}
                      autoComplete="off"
                      aria-label={t('networth.form.nameLabel')}
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
                      <SelectTrigger aria-label={t('networth.form.kindLabel')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {t(`networth.kind.${k}`)}
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
              name="default_currency"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        aria-label={t('networth.form.currencyLabel')}
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
            <Button type="submit" disabled={isSubmitting}>
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

import type { UseFormReturn } from 'react-hook-form';

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
