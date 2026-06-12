import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsOps } from '@/hooks/dataOps/useSettingsOps';
import { useTheme } from '@/hooks/useTheme';
import { useAccentColor, type AccentColorKey } from '@/hooks/useAccentColor';
import { signOut } from '@/lib/auth';
import { useToast } from '@/hooks/useToast';
import { haptics, hapticsSettings } from '@/lib/haptics';
import type { NotificationPreferenceKey } from '@/types/Budget';
import { localToUtcHour } from '@/components/settings/NotificationsSection';

type Theme = 'light' | 'dark' | 'barbie';

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
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() =>
    hapticsSettings.isEnabled(),
  );
  const isHapticsSupported = hapticsSettings.isSupported();

  const handleHapticsToggle = (enabled: boolean) => {
    hapticsSettings.setEnabled(enabled);
    setHapticsEnabled(enabled);
    if (enabled) {
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
    async (enabled: boolean) => {
      let utcHour: number | null = null;
      if (enabled) {
        utcHour = localToUtcHour(9);
      }

      try {
        await handleDailyReminderHourUpdate(utcHour);
      } catch {
        toast({
          variant: 'destructive',
          description: t('settings.notifications.dailyReminderFailed'),
        });
      }
    },
    [handleDailyReminderHourUpdate, toast, t],
  );

  const handleDailyReminderTimeChange = useCallback(
    async (localHour: number) => {
      const utcHour = localToUtcHour(localHour);

      try {
        await handleDailyReminderHourUpdate(utcHour);
      } catch {
        toast({
          variant: 'destructive',
          description: t('settings.notifications.dailyReminderFailed'),
        });
      }
    },
    [handleDailyReminderHourUpdate, toast, t],
  );

  const handlePreferenceToggle = useCallback(
    async (key: NotificationPreferenceKey, enabled: boolean) => {
      try {
        await handleNotificationPreferenceUpdate(key, enabled);
      } catch {
        toast({
          variant: 'destructive',
          description: t('settings.notifications.preferenceUpdateFailed'),
        });
      }
    },
    [handleNotificationPreferenceUpdate, toast, t],
  );

  const handleSignOut = async () => {
    try {
      await signOut();
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
    hapticsEnabled,
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
