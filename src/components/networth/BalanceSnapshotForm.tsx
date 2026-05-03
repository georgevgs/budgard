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
import { useDataOperations } from '@/hooks/useDataOperations';
import {
  cn,
  formatCurrencyInput,
  parseCurrencyInput,
} from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';
import {
  accountBalanceSchema,
  type AccountBalanceFormData,
} from '@/lib/validations';
import type { Account } from '@/types/Account';

export type SnapshotMode = 'value' | 'contribution' | 'withdrawal';

type Props = {
  account: Account;
  onClose: () => void;
  mode?: SnapshotMode;
}

const BalanceSnapshotForm = ({ account, onClose, mode = 'value' }: Props) => {
  const { t, i18n } = useTranslation();
  const dateLocale: Locale = i18n.language === 'el' ? el : enUS;
  const { handleSnapshotCreate } = useDataOperations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isInvestment = account.kind === 'investment';
  const isContributionMode = isInvestment && mode === 'contribution';
  const isWithdrawalMode = isInvestment && mode === 'withdrawal';
  const isCashflowMode = isContributionMode || isWithdrawalMode;

  let balanceDefault = '';
  if (isCashflowMode) {
    // Hidden in deposit/withdrawal modes but the schema requires it; we replace
    // it with current_balance ± amount at submit.
    balanceDefault = formatCurrencyInput(String(account.current_balance));
  }

  const form = useForm<AccountBalanceFormData>({
    resolver: zodResolver(accountBalanceSchema),
    defaultValues: {
      balance: balanceDefault,
      contribution_delta: '',
      recorded_at: new Date(),
      note: '',
    },
  });

  const handleSubmit = async (values: AccountBalanceFormData) => {
    setIsSubmitting(true);
    try {
      const recordedAt = format(values.recorded_at, 'yyyy-MM-dd');

      let contribution: number | null = null;
      if (isInvestment && values.contribution_delta) {
        const trimmed = values.contribution_delta.trim();
        if (trimmed.length > 0) {
          const sign = trimmed.startsWith('-') ? -1 : 1;
          const magnitude = parseCurrencyInput(trimmed.replace(/^-/, ''));
          if (isWithdrawalMode) {
            contribution = -Math.abs(magnitude);
          } else if (isContributionMode) {
            contribution = Math.abs(magnitude);
          } else {
            contribution = sign * magnitude;
          }
        }
      }

      if (isCashflowMode && (contribution == null || contribution === 0)) {
        form.setError('contribution_delta', {
          type: 'required',
          message: t('networth.snapshot.contributionRequired'),
        });
        setIsSubmitting(false);

        return;
      }

      let balance: number;
      if (isCashflowMode) {
        balance = account.current_balance + (contribution ?? 0);
      } else {
        balance = parseCurrencyInput(values.balance);
      }

      await handleSnapshotCreate({
        account_id: account.id,
        balance,
        contribution_delta: contribution,
        recorded_at: recordedAt,
        note: values.note?.trim() || null,
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
                {renderTitle(mode, account.name, t)}
              </DialogTitle>
              <DialogDescription>
                {renderSnapshotDescription(isInvestment, mode, t)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pb-4">
            {renderBalanceField(form, account, isInvestment, isCashflowMode, t)}

            {renderContributionField(
              form,
              isInvestment,
              isContributionMode,
              isWithdrawalMode,
              account.default_currency,
              t,
            )}

            <FormField
              control={form.control}
              name="recorded_at"
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
                          {field.value
                            ? format(field.value, 'PPP', { locale: dateLocale })
                            : t('networth.snapshot.pickDate')}
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
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('networth.snapshot.notePlaceholder')}
                      autoComplete="off"
                      aria-label={t('networth.snapshot.noteLabel')}
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

export default BalanceSnapshotForm;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

import type { UseFormReturn } from 'react-hook-form';

const renderTitle = (
  mode: SnapshotMode,
  name: string,
  t: TranslateFunction,
) => {
  if (mode === 'contribution') {
    return t('networth.snapshot.contributionTitle', { name });
  }
  if (mode === 'withdrawal') {
    return t('networth.snapshot.withdrawalTitle', { name });
  }

  return t('networth.snapshot.title', { name });
};

const renderSnapshotDescription = (
  isInvestment: boolean,
  mode: SnapshotMode,
  t: TranslateFunction,
) => {
  if (mode === 'contribution') {
    return t('networth.snapshot.descriptionContribution');
  }
  if (mode === 'withdrawal') {
    return t('networth.snapshot.descriptionWithdrawal');
  }
  if (isInvestment) return t('networth.snapshot.descriptionInvestment');

  return t('networth.snapshot.description');
};

const renderSubmitLabel = (isSubmitting: boolean, t: TranslateFunction) => {
  if (isSubmitting) return t('common.saving');

  return t('networth.snapshot.save');
};

const renderBalanceField = (
  form: UseFormReturn<AccountBalanceFormData>,
  account: Account,
  isInvestment: boolean,
  isCashflowMode: boolean,
  t: TranslateFunction,
) => {
  if (isCashflowMode) return null;

  let placeholder = t('networth.snapshot.balancePlaceholder');
  let label = t('networth.snapshot.balanceLabel');
  if (isInvestment) {
    placeholder = t('networth.snapshot.valuePlaceholder');
    label = t('networth.snapshot.valueLabel');
  }

  return (
    <FormField
      control={form.control}
      name="balance"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <CurrencyInput
              currency={account.default_currency}
              value={field.value}
              onChange={field.onChange}
              placeholder={placeholder}
              aria-label={label}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

const renderContributionField = (
  form: UseFormReturn<AccountBalanceFormData>,
  isInvestment: boolean,
  isContributionMode: boolean,
  isWithdrawalMode: boolean,
  currency: string,
  t: TranslateFunction,
) => {
  if (!isInvestment) return null;
  // "Update value" is now strictly about value — contributions go through the
  // dedicated Add money / Withdraw modes, so we hide this field in value mode.
  if (!isContributionMode && !isWithdrawalMode) return null;

  let placeholder = t('networth.snapshot.contributionPlaceholder');
  let hint = t('networth.snapshot.contributionHint');
  let pattern = '-?[0-9,.]*';
  if (isContributionMode) {
    placeholder = t('networth.snapshot.contributionOnlyPlaceholder');
    hint = t('networth.snapshot.contributionOnlyHint');
    pattern = '[0-9,.]*';
  }
  if (isWithdrawalMode) {
    placeholder = t('networth.snapshot.withdrawalOnlyPlaceholder');
    hint = t('networth.snapshot.withdrawalOnlyHint');
    pattern = '[0-9,.]*';
  }

  return (
    <FormField
      control={form.control}
      name="contribution_delta"
      render={({ field }) => (
        <FormItem>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {getCurrencySymbol(currency)}
            </span>
            <FormControl>
              <Input
                type="text"
                inputMode="decimal"
                pattern={pattern}
                placeholder={placeholder}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value)}
                className="pl-7"
                aria-label={t('networth.snapshot.contributionLabel')}
              />
            </FormControl>
          </div>
          <p className="text-xs text-muted-foreground">{hint}</p>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
