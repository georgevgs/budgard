import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataActions, useDataConfig } from '@/common/contexts/DataContext';
import { dataService } from '@/common/api/dataService';
import { authApi } from '@/common/api/authApi';
import type { NotificationPreferenceKey } from '@/types/Budget';
import { setScalarOptimistic } from '@/common/hooks/dataOps/helpers';
import { useMutationRunner } from '@/common/hooks/dataOps/useMutationRunner';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';

// Every setting here is the same write: show the new value, save it, put the
// old one back if that fails. None of them buzz on success — the control
// moving under the user's finger is the confirmation.
export const useSettingsOps = () => {
  const { activeOwnerId } = useFinancialSpace();
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
  const runMutation = useMutationRunner();

  return useMemo(() => {
    const handleCurrencyUpdate = (currency: string) =>
      runMutation({
        operation: 'updateDefaultCurrency',
        errorMessage: t('settings.currency.updateFailed'),
        successHaptic: 'none',
        optimistic: () =>
          setScalarOptimistic(setDefaultCurrency, defaultCurrency, currency),
        perform: () =>
          dataService.updateDefaultCurrency(currency, activeOwnerId),
      });

    const handleDailyReminderHourUpdate = (hour: number | null) =>
      runMutation({
        operation: 'updateDailyReminderHour',
        errorMessage: t('settings.notifications.dailyReminderFailed'),
        successHaptic: 'none',
        optimistic: () =>
          setScalarOptimistic(setDailyReminderHour, dailyReminderHour, hour),
        perform: () => dataService.updateDailyReminderHour(hour),
      });

    const handleNotificationPreferenceUpdate = (
      key: NotificationPreferenceKey,
      enabled: boolean,
    ) => {
      const next = { ...notificationPreferences, [key]: enabled };

      return runMutation({
        operation: 'updateNotificationPreferences',
        errorMessage: t('settings.notifications.preferencesUpdateFailed'),
        successHaptic: 'none',
        optimistic: () =>
          setScalarOptimistic(
            setNotificationPreferences,
            notificationPreferences,
            next,
          ),
        perform: () => dataService.updateNotificationPreferences(next),
      });
    };

    const handleSavingsPctUpdate = (pct: number | null) =>
      runMutation({
        operation: 'updateDefaultSavingsPct',
        errorMessage: t('income.toasts.savingsRateUpdateFailed'),
        successHaptic: 'none',
        optimistic: () =>
          setScalarOptimistic(setDefaultSavingsPct, defaultSavingsPct, pct),
        perform: () => dataService.updateDefaultSavingsPct(pct, activeOwnerId),
      });

    // No retry: re-running an account deletion on a tap is not a kindness.
    const handleDeleteAccount = () =>
      runMutation({
        operation: 'deleteAccount',
        errorMessage: t('settings.data.deleteAccountFailed'),
        successHaptic: 'none',
        isRetryable: false,
        perform: async () => {
          await dataService.deleteAccount();
          await authApi.signOut();
        },
      });

    return {
      handleCurrencyUpdate,
      handleDailyReminderHourUpdate,
      handleNotificationPreferenceUpdate,
      handleSavingsPctUpdate,
      handleDeleteAccount,
    };
  }, [
    activeOwnerId,
    defaultCurrency,
    defaultSavingsPct,
    dailyReminderHour,
    notificationPreferences,
    setDefaultCurrency,
    setDefaultSavingsPct,
    setDailyReminderHour,
    setNotificationPreferences,
    runMutation,
    t,
  ]);
};
