import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataConfig } from '@/contexts/DataContext';
import { useSettingsOps } from '@/hooks/dataOps/useSettingsOps';
import { useToast } from '@/hooks/useToast';

/**
 * Gates the default-currency change behind a confirmation.
 *
 * Stored amounts are plain numbers in whatever the default currency was when
 * they were written; changing the default re-labels them all and converts
 * nothing. That is a defensible design — converting a whole ledger at one
 * arbitrary day's rate would be its own kind of wrong — but doing it silently
 * on a tap is not. The user confirms, knowing what does and does not change.
 */
export const useCurrencyChange = () => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const { handleCurrencyUpdate } = useSettingsOps();
  const { toast } = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const request = (currency: string) => {
    if (currency === defaultCurrency) {
      return;
    }

    setPending(currency);
  };

  const dismiss = (open: boolean) => {
    if (open) {
      return;
    }

    setPending(null);
  };

  const confirm = async () => {
    const currency = pending;
    if (!currency) {
      return;
    }

    setPending(null);
    setIsUpdating(true);
    try {
      await handleCurrencyUpdate(currency);
      toast({ title: t('settings.currency.updated') });
    } catch {
      toast({
        title: t('settings.currency.updateFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return { pending, isUpdating, request, dismiss, confirm };
};
