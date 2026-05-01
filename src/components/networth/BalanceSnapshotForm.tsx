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

type Props = {
  account: Account;
  onClose: () => void;
}

const BalanceSnapshotForm = ({ account, onClose }: Props) => {
  const { t, i18n } = useTranslation();
  const dateLocale: Locale = i18n.language === 'el' ? el : enUS;
  const { handleSnapshotCreate } = useDataOperations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isInvestment = account.kind === 'investment';

  const form = useForm<AccountBalanceFormData>({
    resolver: zodResolver(accountBalanceSchema),
    defaultValues: {
      balance: '',
      contribution_delta: '',
      recorded_at: new Date(),
      note: '',
    },
  });

  const handleSubmit = async (values: AccountBalanceFormData) => {
    setIsSubmitting(true);
    try {
      const balance = parseCurrencyInput(values.balance);
      const recordedAt = format(values.recorded_at, 'yyyy-MM-dd');

      let contribution: number | null = null;
      if (isInvestment && values.contribution_delta) {
        const trimmed = values.contribution_delta.trim();
        if (trimmed.length > 0) {
          const sign = trimmed.startsWith('-') ? -1 : 1;
          contribution =
            sign * parseCurrencyInput(trimmed.replace(/^-/, ''));
        }
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
    <div className="flex flex-col max-h-full">
      <div className="flex justify-center pt-3 pb-2 sm:hidden" data-drag-handle>
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
      </div>

      <div
        className="overflow-y-auto flex-1 px-4 sm:px-6 overscroll-contain"
        style={{ touchAction: 'pan-y' }}
      >
        <DialogHeader className="pb-4" data-draggable-area>
          <DialogTitle className="text-xl">
            {t('networth.snapshot.title', { name: account.name })}
          </DialogTitle>
          <DialogDescription>
            {isInvestment
              ? t('networth.snapshot.descriptionInvestment')
              : t('networth.snapshot.description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 pb-4"
          >
            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {getCurrencySymbol(account.default_currency)}
                    </span>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9,.]*"
                        placeholder={
                          isInvestment
                            ? t('networth.snapshot.valuePlaceholder')
                            : t('networth.snapshot.balancePlaceholder')
                        }
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(formatCurrencyInput(e.target.value))
                        }
                        className="pl-7"
                        aria-label={
                          isInvestment
                            ? t('networth.snapshot.valueLabel')
                            : t('networth.snapshot.balanceLabel')
                        }
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {renderContributionField(form, isInvestment, account.default_currency, t)}

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

            <div className="flex gap-3 justify-end pt-2 pb-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('common.saving') : t('networth.snapshot.save')}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default BalanceSnapshotForm;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

import type { UseFormReturn } from 'react-hook-form';

const renderContributionField = (
  form: UseFormReturn<AccountBalanceFormData>,
  isInvestment: boolean,
  currency: string,
  t: TranslateFunction,
) => {
  if (!isInvestment) return null;

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
                pattern="-?[0-9,.]*"
                placeholder={t('networth.snapshot.contributionPlaceholder')}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value)}
                className="pl-7"
                aria-label={t('networth.snapshot.contributionLabel')}
              />
            </FormControl>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('networth.snapshot.contributionHint')}
          </p>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
