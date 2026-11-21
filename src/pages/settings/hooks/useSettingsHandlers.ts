import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsOps } from '@/common/hooks/dataOps/useSettingsOps';
import { useTheme, type Theme } from '@/common/hooks/useTheme';
import {
  useAccentColor,
  type AccentColorKey,
} from '@/pages/settings/hooks/useAccentColor';
import { authApi } from '@/common/api/authApi';
import { useToast } from '@/common/hooks/useToast';
import { haptics, hapticsSettings } from '@/constants/haptics';
import type { NotificationPreferenceKey } from '@/types/Budget';
import { localToUtcHour } from '@/pages/settings/utils/reminderTime';

export const useSettingsHandlers = () => {
  const { t } = useTranslation();
  const {
    handleDeleteAccount,
    handleDailyReminderHourUpdate,
    handleNotificationPreferenceUpdate,
  } = useSettingsOps();
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccentColor();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [areHapticsEnabled, setAreHapticsEnabled] = useState<boolean>(() =>
    hapticsSettings.isEnabled(),
  );
  const isHapticsSupported = hapticsSettings.isSupported();

  const handleHapticsToggle = (isEnabled: boolean) => {
    hapticsSettings.setEnabled(isEnabled);
    setAreHapticsEnabled(isEnabled);
    if (isEnabled) {
      haptics.success();
    }
  };

  const handleThemeSelect = (next: Theme) => {
    haptics.selection();
    setTheme(next);
  };

  const handleAccentSelect = (key: AccentColorKey) => {
    haptics.selection();
    setAccent(key);
  };

  const handleDailyReminderToggle = useCallback(
    async (isEnabled: boolean) => {
      let utcHour: number | null = null;
      if (isEnabled) {
        utcHour = localToUtcHour(9);
      }

      await handleDailyReminderHourUpdate(utcHour).catch(() => undefined);
    },
    [handleDailyReminderHourUpdate],
  );

  const handleDailyReminderTimeChange = useCallback(
    async (localHour: number) => {
      const utcHour = localToUtcHour(localHour);

      await handleDailyReminderHourUpdate(utcHour).catch(() => undefined);
    },
    [handleDailyReminderHourUpdate],
  );

  const handlePreferenceToggle = useCallback(
    async (key: NotificationPreferenceKey, isEnabled: boolean) => {
      await handleNotificationPreferenceUpdate(key, isEnabled).catch(
        () => undefined,
      );
    },
    [handleNotificationPreferenceUpdate],
  );

  const handleSignOut = async () => {
    try {
      await authApi.signOut();
    } catch {
      // Supabase clears local session even on network failure
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await handleDeleteAccount();
      toast({ title: t('settings.data.deleteAccountSuccess') });
    } catch {
      toast({
        title: t('settings.data.deleteAccountFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    theme,
    accent,
    isHapticsSupported,
    areHapticsEnabled,
    isDeleting,
    handleHapticsToggle,
    handleThemeSelect,
    handleAccentSelect,
    handleDailyReminderToggle,
    handleDailyReminderTimeChange,
    handlePreferenceToggle,
    handleSignOut,
    handleConfirmDelete,
  };
};
