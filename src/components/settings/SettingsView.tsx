import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Check from 'lucide-react/dist/esm/icons/check';
import Moon from 'lucide-react/dist/esm/icons/moon';
import Sun from 'lucide-react/dist/esm/icons/sun';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Bell from 'lucide-react/dist/esm/icons/bell';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useDataConfig } from '@/contexts/DataContext';
import { useSettingsOps } from '@/hooks/dataOps/useSettingsOps';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTheme } from '@/hooks/useTheme';
import {
  ACCENT_COLORS,
  useAccentColor,
  type AccentColorKey,
} from '@/hooks/useAccentColor';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { signOut } from '@/lib/auth';
import { useToast } from '@/hooks/useToast';
import { haptics, hapticsSettings } from '@/lib/haptics';

type Theme = 'light' | 'dark' | 'barbie';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'el', name: 'Ελληνικά' },
];

const SettingsView = () => {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const { defaultCurrency, dailyReminderHour } = useDataConfig();
  const {
    handleCurrencyUpdate,
    handleDeleteAccount,
    handleDailyReminderHourUpdate,
  } = useSettingsOps();
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccentColor();
  const { toast } = useToast();
  const { state: pushState, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
      // Default to 9:00 local time when enabling
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
      toast({
        title: t('settings.currency.updated'),
      });
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
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="container max-w-lg mx-auto p-4 pb-12 space-y-8">
      <h2 className="text-lg font-semibold tracking-tight">{t('settings.title')}</h2>

      {/* Profile */}
      <section className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {t('settings.profile.title')}
        </p>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t('settings.profile.email')}
              </span>
              <span className="text-sm font-medium truncate ml-4">
                {session?.user?.email}
              </span>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive"
              onClick={() => setShowSignOutDialog(true)}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('settings.profile.signOut')}
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Appearance */}
      <section className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {t('settings.appearance.title')}
        </p>
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <p className="text-sm mb-2">{t('settings.appearance.theme')}</p>
              <div className="flex flex-wrap gap-2">
                {renderThemeButton('light', theme, handleThemeSelect, t)}
                {renderThemeButton('dark', theme, handleThemeSelect, t)}
                {renderThemeButton('barbie', theme, handleThemeSelect, t)}
              </div>
            </div>
            {renderAccentPicker(theme === 'barbie', accent, handleAccentSelect, t)}
            {renderHapticsToggle(
              isHapticsSupported,
              hapticsEnabled,
              handleHapticsToggle,
              t,
            )}
          </CardContent>
        </Card>
      </section>

      {/* Language */}
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

      {/* Currency */}
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

      {/* Notifications */}
      <section className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {t('settings.notifications.title')}
        </p>
        <Card>
          <CardContent className="p-4 space-y-4">
            {renderNotificationToggle(pushState, pushSubscribe, pushUnsubscribe, t)}
            {renderDailyReminder(
              pushState,
              dailyReminderHour,
              handleDailyReminderToggle,
              handleDailyReminderTimeChange,
              t,
            )}
          </CardContent>
        </Card>
      </section>

      {/* Data Management */}
      <section className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {t('settings.data.title')}
        </p>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-3">
              {t('settings.data.deleteAccountDescription')}
            </p>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('settings.data.deleteAccount')}
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* About */}
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

      {/* Sign Out confirmation */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent
          className="sm:max-w-[425px]"
          onOpenChange={setShowSignOutDialog}
        >
          <AlertDialogHeader data-draggable-area>
            <AlertDialogTitle>
              {t('settings.profile.signOutConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.profile.signOutConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>
              {t('settings.profile.signOut')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent
          className="sm:max-w-[425px]"
          onOpenChange={setShowDeleteDialog}
        >
          <AlertDialogHeader data-draggable-area>
            <AlertDialogTitle>
              {t('settings.data.deleteAccountConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.data.deleteAccountConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('settings.data.deleteAccountConfirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsView;

// ─── Helper render functions ──────────────────────────────────────────────────

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const THEME_ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  barbie: Sparkles,
};

const renderThemeButton = (
  themeName: Theme,
  currentTheme: string,
  setTheme: (theme: Theme) => void,
  t: TFunc,
) => {
  const Icon = THEME_ICONS[themeName];
  const isActive = currentTheme === themeName;

  return (
    <Button
      key={themeName}
      variant={getThemeButtonVariant(isActive)}
      size="sm"
      onClick={() => setTheme(themeName)}
      className={getThemeButtonClass(themeName, isActive)}
    >
      <Icon className="h-4 w-4 mr-1.5" />
      {t(`theme.${themeName}`)}
    </Button>
  );
};

const getThemeButtonVariant = (
  isActive: boolean,
): 'default' | 'outline' => {
  if (isActive) {
    return 'default';
  }

  return 'outline';
};

const getThemeButtonClass = (themeName: string, isActive: boolean): string => {
  if (themeName === 'barbie' && !isActive) {
    return 'text-pink-500';
  }

  return '';
};

const renderAccentPicker = (
  isBarbie: boolean,
  accent: AccentColorKey,
  setAccent: (key: AccentColorKey) => void,
  t: TFunc,
) => {
  if (isBarbie) return null;

  return (
    <div>
      <p className="text-sm mb-2">{t('settings.appearance.accentColor')}</p>
      <div className="flex justify-between">
        {ACCENT_COLORS.map((color) => {
          const isSelected = color.key === accent;

          return (
            <button
              key={color.key}
              type="button"
              onClick={() => setAccent(color.key)}
              className="relative h-10 w-10 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ backgroundColor: color.values.swatch }}
              aria-label={t(`accent.colors.${color.key}`)}
              aria-pressed={isSelected}
            >
              {renderAccentCheck(isSelected)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const renderAccentCheck = (isSelected: boolean) => {
  if (!isSelected) return null;

  return (
    <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow-sm" />
  );
};

const renderHapticsToggle = (
  isSupported: boolean,
  enabled: boolean,
  onToggle: (enabled: boolean) => void,
  t: TFunc,
) => {
  if (!isSupported) return null;

  return (
    <div className="flex items-center justify-between border-t border-border/50 pt-4">
      <div>
        <p className="text-sm">{t('settings.appearance.haptics')}</p>
        <p className="text-xs text-muted-foreground">
          {t('settings.appearance.hapticsDescription')}
        </p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        aria-label={t('settings.appearance.haptics')}
      />
    </div>
  );
};

type PushState = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed';

const renderNotificationToggle = (
  state: PushState,
  subscribe: () => Promise<void>,
  unsubscribe: () => Promise<void>,
  t: TFunc,
) => {
  if (state === 'unsupported') {
    return (
      <div className="flex items-center gap-3">
        <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-sm text-muted-foreground">
          {t('settings.notifications.unsupported')}
        </p>
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="flex items-center gap-3">
        <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <p className="text-sm">{t('settings.notifications.pushLabel')}</p>
          <p className="text-xs text-muted-foreground">
            {t('settings.notifications.denied')}
          </p>
        </div>
      </div>
    );
  }

  const handleToggle = (checked: boolean) => {
    if (checked) {
      subscribe();
    } else {
      unsubscribe();
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <p className="text-sm">{t('settings.notifications.pushLabel')}</p>
          <p className="text-xs text-muted-foreground">
            {t('settings.notifications.pushDescription')}
          </p>
        </div>
      </div>
      <Switch
        checked={state === 'subscribed'}
        disabled={state === 'loading'}
        onCheckedChange={handleToggle}
        aria-label={t('settings.notifications.pushLabel')}
      />
    </div>
  );
};

const REMINDER_HOURS = Array.from({ length: 24 }, (_, i) => i);

const localToUtcHour = (localHour: number): number => {
  const d = new Date();
  d.setHours(localHour, 0, 0, 0);

  return d.getUTCHours();
};

const utcToLocalHour = (utcHour: number): number => {
  const d = new Date();
  d.setUTCHours(utcHour, 0, 0, 0);

  return d.getHours();
};

const formatHour = (hour: number): string => {
  return `${hour.toString().padStart(2, '0')}:00`;
};

const renderDailyReminder = (
  pushState: PushState,
  reminderHour: number | null,
  onToggle: (enabled: boolean) => void,
  onTimeChange: (localHour: number) => void,
  t: TFunc,
) => {
  // Only show daily reminder if push notifications are enabled
  if (pushState !== 'subscribed') return null;

  const isEnabled = reminderHour !== null;
  const localHour = isEnabled ? utcToLocalHour(reminderHour) : 9;

  return (
    <div className="border-t border-border/50 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm">{t('settings.notifications.dailyReminderLabel')}</p>
          <p className="text-xs text-muted-foreground">
            {t('settings.notifications.dailyReminderDescription')}
          </p>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={onToggle}
          aria-label={t('settings.notifications.dailyReminderLabel')}
        />
      </div>
      {renderReminderTimePicker(isEnabled, localHour, onTimeChange, t)}
    </div>
  );
};

const renderReminderTimePicker = (
  isEnabled: boolean,
  localHour: number,
  onTimeChange: (localHour: number) => void,
  t: TFunc,
) => {
  if (!isEnabled) return null;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {t('settings.notifications.dailyReminderTime')}
      </p>
      <Select
        value={localHour.toString()}
        onValueChange={(value) => onTimeChange(parseInt(value))}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {REMINDER_HOURS.map((hour) => (
            <SelectItem key={hour} value={hour.toString()}>
              {formatHour(hour)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
