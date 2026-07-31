import { useCallback, useMemo } from 'react';
import * as Sentry from '@/lib/sentry';
import { useTranslation } from 'react-i18next';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import { signOut } from '@/lib/auth';
import type { NotificationPreferenceKey } from '@/types/Budget';
import { useShowErrorToast } from '@/hooks/dataOps/useShowErrorToast';

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
  const { t } = useTranslation();
  const showErrorToast = useShowErrorToast();

  const handleCurrencyUpdate = useCallback(
    async (currency: string) => {
      const run = async () => {
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
          showErrorToast(t('settings.currency.updateFailed'), () => {
            void run().catch(() => undefined);
          });
          throw error;
        }
      };

      return run();
    },
    [defaultCurrency, setDefaultCurrency, showErrorToast, t],
  );

  const handleDailyReminderHourUpdate = useCallback(
    async (hour: number | null) => {
      const run = async () => {
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
          showErrorToast(t('settings.notifications.dailyReminderFailed'), () => {
            void run().catch(() => undefined);
          });
          throw error;
        }
      };

      return run();
    },
    [dailyReminderHour, setDailyReminderHour, showErrorToast, t],
  );

  const handleNotificationPreferenceUpdate = useCallback(
    async (key: NotificationPreferenceKey, enabled: boolean) => {
      const run = async () => {
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
          showErrorToast(t('settings.notifications.preferencesUpdateFailed'), () => {
            void run().catch(() => undefined);
          });
          throw error;
        }
      };

      return run();
    },
    [notificationPreferences, setNotificationPreferences, showErrorToast, t],
  );

  const handleSavingsPctUpdate = useCallback(
    async (pct: number | null) => {
      const run = async () => {
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
          showErrorToast(t('income.toasts.savingsRateUpdateFailed'), () => {
            void run().catch(() => undefined);
          });
          throw error;
        }
      };

      return run();
    },
    [defaultSavingsPct, setDefaultSavingsPct, showErrorToast, t],
  );

  const handleDeleteAccount = useCallback(async () => {
    try {
      await dataService.deleteAccount();
      await signOut();
    } catch (error) {
      haptics.error();
      Sentry.captureException(error, { tags: { operation: 'deleteAccount' } });
      showErrorToast(t('settings.data.deleteAccountFailed'));
      throw error;
    }
  }, [showErrorToast, t]);

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
