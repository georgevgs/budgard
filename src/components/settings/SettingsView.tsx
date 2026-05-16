import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useDataConfig } from '@/contexts/DataContext';
import { useSettingsOps } from '@/hooks/dataOps/useSettingsOps';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTheme } from '@/hooks/useTheme';
import { useAccentColor, type AccentColorKey } from '@/hooks/useAccentColor';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { signOut } from '@/lib/auth';
import { useToast } from '@/hooks/useToast';
import { haptics, hapticsSettings } from '@/lib/haptics';
import type { NotificationPreferenceKey } from '@/types/Budget';
import AppearanceSection from './AppearanceSection';
import NotificationsSection, { localToUtcHour } from './NotificationsSection';
import ProfileSection from './ProfileSection';
import DataManagementSection from './DataManagementSection';

type Theme = 'light' | 'dark' | 'barbie';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'el', name: 'Ελληνικά' },
];

const SettingsView = () => {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const { defaultCurrency, dailyReminderHour, notificationPreferences } =
    useDataConfig();
  const {
    handleCurrencyUpdate,
    handleDeleteAccount,
    handleDailyReminderHourUpdate,
    handleNotificationPreferenceUpdate,
  } = useSettingsOps();
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccentColor();
  const { toast } = useToast();
  const {
    state: pushState,
    subscribe: pushSubscribe,
    unsubscribe: pushUnsubscribe,
  } = usePushNotifications();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCurrencyUpdating, setIsCurrencyUpdating] = useState(false);
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

  const handleCurrencyChange = async (currency: string) => {
    setIsCurrencyUpdating(true);
    try {
      await handleCurrencyUpdate(currency);
      toast({ title: t('settings.currency.updated') });
    } catch {
      toast({
        title: t('settings.currency.updateFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsCurrencyUpdating(false);
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

  return (
    <div className="container max-w-lg mx-auto p-4 pb-12 space-y-8">
      <h2 className="text-lg font-semibold tracking-tight">
        {t('settings.title')}
      </h2>

      <ProfileSection
        email={session?.user?.email}
        onSignOut={handleSignOut}
        t={t}
      />

      <AppearanceSection
        theme={theme}
        accent={accent}
        isHapticsSupported={isHapticsSupported}
        hapticsEnabled={hapticsEnabled}
        onThemeSelect={handleThemeSelect}
        onAccentSelect={handleAccentSelect}
        onHapticsToggle={handleHapticsToggle}
        t={t}
      />

      <section className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {t('settings.language.title')}
        </p>
        <Card>
          <CardContent className="p-4">
            <Select
              value={i18n.language}
              onValueChange={(lang) => i18n.changeLanguage(lang)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('settings.language.select')} />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {t('settings.currency.title')}
        </p>
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-sm">{t('settings.currency.default')}</p>
            <p className="text-xs text-muted-foreground mb-2">
              {t('settings.currency.defaultDescription')}
            </p>
            <Select
              value={defaultCurrency}
              onValueChange={handleCurrencyChange}
              disabled={isCurrencyUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {SUPPORTED_CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </section>

      <NotificationsSection
        pushState={pushState}
        dailyReminderHour={dailyReminderHour}
        notificationPreferences={notificationPreferences}
        onPushSubscribe={pushSubscribe}
        onPushUnsubscribe={pushUnsubscribe}
        onDailyReminderToggle={handleDailyReminderToggle}
        onDailyReminderTimeChange={handleDailyReminderTimeChange}
        onPreferenceToggle={handlePreferenceToggle}
        t={t}
      />

      <DataManagementSection
        onConfirmDelete={handleConfirmDelete}
        isDeleting={isDeleting}
        t={t}
      />

      <section className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {t('settings.about.title')}
        </p>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t('settings.about.version')}
              </span>
              <span className="text-sm tabular-nums">{__APP_VERSION__}</span>
            </div>
            <p className="text-xs text-muted-foreground text-center pt-1 border-t">
              {t('settings.about.madeWith')}
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default SettingsView;
