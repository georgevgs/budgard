import { useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import { signOut } from '@/lib/auth';
import { useShowErrorToast } from './useShowErrorToast';

export const useSettingsOps = () => {
  const { defaultCurrency, defaultSavingsPct, dailyReminderHour } =
    useDataConfig();
  const { setDefaultCurrency, setDefaultSavingsPct, setDailyReminderHour } =
    useDataActions();
  const showErrorToast = useShowErrorToast();

  const handleCurrencyUpdate = useCallback(
    async (currency: string) => {
      const previousCurrency = defaultCurrency;
      setDefaultCurrency(currency);

      try {
        await dataService.updateDefaultCurrency(currency);
      } catch (error) {
        haptics.error();
        setDefaultCurrency(previousCurrency);
        Sentry.captureException(error, {
          tags: { operation: 'updateDefaultCurrency' },
        });
        showErrorToast('Failed to update currency');
        throw error;
      }
    },
    [defaultCurrency, setDefaultCurrency, showErrorToast],
  );

  const handleDailyReminderHourUpdate = useCallback(
    async (hour: number | null) => {
      const previous = dailyReminderHour;
      setDailyReminderHour(hour);

      try {
        await dataService.updateDailyReminderHour(hour);
      } catch (error) {
        haptics.error();
        setDailyReminderHour(previous);
        Sentry.captureException(error, {
          tags: { operation: 'updateDailyReminderHour' },
        });
        showErrorToast('Failed to update daily reminder');
        throw error;
      }
    },
    [dailyReminderHour, setDailyReminderHour, showErrorToast],
  );

  const handleSavingsPctUpdate = useCallback(
    async (pct: number | null) => {
      const previous = defaultSavingsPct;
      setDefaultSavingsPct(pct);

      try {
        await dataService.updateDefaultSavingsPct(pct);
      } catch (error) {
        haptics.error();
        setDefaultSavingsPct(previous);
        Sentry.captureException(error, {
          tags: { operation: 'updateDefaultSavingsPct' },
        });
        showErrorToast('Failed to update savings rate');
        throw error;
      }
    },
    [defaultSavingsPct, setDefaultSavingsPct, showErrorToast],
  );

  const handleDeleteAccount = useCallback(async () => {
    try {
      await dataService.deleteAccount();
      await signOut();
    } catch (error) {
      haptics.error();
      Sentry.captureException(error, { tags: { operation: 'deleteAccount' } });
      showErrorToast('Failed to delete account');
      throw error;
    }
  }, [showErrorToast]);

  return useMemo(
    () => ({
      handleCurrencyUpdate,
      handleDailyReminderHourUpdate,
      handleSavingsPctUpdate,
      handleDeleteAccount,
    }),
    [
      handleCurrencyUpdate,
      handleDailyReminderHourUpdate,
      handleSavingsPctUpdate,
      handleDeleteAccount,
    ],
  );
};
