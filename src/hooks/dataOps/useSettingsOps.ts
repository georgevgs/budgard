import { useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import { signOut } from '@/lib/auth';
import type { NotificationPreferenceKey } from '@/types/Budget';
import { useShowErrorToast } from './useShowErrorToast';

export const useSettingsOps = () => {
  const {
    defaultCurrency,
    defaultSavingsPct,
    dailyReminderHour,
    notificationPreferences,
  } = useDataConfig();
  const {
    setDefaultCurrency,
    setDefaultSavingsPct,
    setDailyReminderHour,
    setNotificationPreferences,
  } = useDataActions();
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

  const handleNotificationPreferenceUpdate = useCallback(
    async (key: NotificationPreferenceKey, enabled: boolean) => {
      const previous = notificationPreferences;
      const next = { ...previous, [key]: enabled };
      setNotificationPreferences(next);

      try {
        await dataService.updateNotificationPreferences(next);
      } catch (error) {
        haptics.error();
        setNotificationPreferences(previous);
        Sentry.captureException(error, {
          tags: { operation: 'updateNotificationPreferences' },
        });
        showErrorToast('Failed to update notification preferences');
        throw error;
      }
    },
    [notificationPreferences, setNotificationPreferences, showErrorToast],
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
      handleNotificationPreferenceUpdate,
      handleSavingsPctUpdate,
      handleDeleteAccount,
    }),
    [
      handleCurrencyUpdate,
      handleDailyReminderHourUpdate,
      handleNotificationPreferenceUpdate,
      handleSavingsPctUpdate,
      handleDeleteAccount,
    ],
  );
};
