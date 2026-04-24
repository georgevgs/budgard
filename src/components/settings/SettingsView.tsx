import { useState, useEffect, useCallback } from 'react';
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
import { useData } from '@/contexts/DataContext';
import { useDataOperations } from '@/hooks/useDataOperations';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTheme } from '@/hooks/useTheme';
import {
  ACCENT_COLORS,
  useAccentColor,
  type AccentColorKey,
} from '@/hooks/useAccentColor';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { signOut } from '@/lib/auth';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/useToast';

type Theme = 'light' | 'dark' | 'barbie';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'el', name: 'Ελληνικά' },
];

const SettingsView = () => {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const { defaultCurrency } = useData();
  const { handleCurrencyUpdate, handleDeleteAccount } = useDataOperations();
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccentColor();
  const { toast } = useToast();
  const { state: pushState, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCurrencyUpdating, setIsCurrencyUpdating] = useState(false);
  const [dailyReminderHour, setDailyReminderHour] = useState<number | null>(null);

  // Fetch daily reminder preference on mount
  useEffect(() => {
    dataService.getBudget().then((budget) => {
      if (budget) {
        setDailyReminderHour(budget.daily_reminder_hour);
      }
    });
  }, []);

  const handleDailyReminderToggle = useCallback(
    async (enabled: boolean) => {
      // Default to 9:00 local time when enabling
      const utcHour = enabled
        ? localToUtcHour(9)
        : null;

      try {
        await dataService.updateDailyReminderHour(utcHour);
        setDailyReminderHour(utcHour);
      } catch {
        toast({
          variant: 'destructive',
          description: t('settings.notifications.dailyReminderFailed'),
        });
      }
    },
    [toast, t],
  );

  const handleDailyReminderTimeChange = useCallback(
    async (localHour: number) => {
      const utcHour = localToUtcHour(localHour);

      try {
        await dataService.updateDailyReminderHour(utcHour);
        setDailyReminderHour(utcHour);
      } catch {
        toast({
          variant: 'destructive',
          description: t('settings.notifications.dailyReminderFailed'),
        });
      }
    },
    [toast, t],
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
    <div className="container max-w-lg mx-auto p-4 space-y-8">
      <h2 className="text-lg font-semibold">{t('settings.title')}</h2>

      {/* Profile */}
      <section className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {t('settings.profile.title')}
        </p>
        <Card className="border-border/50 rounded-2xl">
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
              className="w-full justify-start text-destructive hover:text-destructive"
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
        <Card className="border-border/50 rounded-2xl">
          <CardContent className="p-4 space-y-4">
            <div>
              <p className="text-sm mb-2">{t('settings.appearance.theme')}</p>
              <div className="flex flex-wrap gap-2">
                {renderThemeButton('light', theme, setTheme, t)}
                {renderThemeButton('dark', theme, setTheme, t)}
                {renderThemeButton('barbie', theme, setTheme, t)}
              </div>
            </div>
            {renderAccentPicker(theme === 'barbie', accent, setAccent, t)}
          </CardContent>
        </Card>
      </section>

      {/* Language */}
      <section className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {t('settings.language.title')}
        </p>
        <Card className="border-border/50 rounded-2xl">
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
        <Card className="border-border/50 rounded-2xl">
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
        <Card className="border-border/50 rounded-2xl">
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
        <Card className="border-border/50 rounded-2xl">
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
        <Card className="border-border/50 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t('settings.about.version')}
              </span>
              <span className="text-sm tabular-nums">{__APP_VERSION__}</span>
            </div>
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
      variant={isActive ? 'default' : 'outline'}
      size="sm"
      onClick={() => setTheme(themeName)}
      className={themeName === 'barbie' && !isActive ? 'text-pink-500' : ''}
    >
      <Icon className="h-4 w-4 mr-1.5" />
      {t(`theme.${themeName}`)}
    </Button>
  );
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
      <div className="flex gap-2">
        {ACCENT_COLORS.map((color) => {
          const isSelected = color.key === accent;

          return (
            <button
              key={color.key}
              type="button"
              onClick={() => setAccent(color.key)}
              className="relative h-9 w-9 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px] min-w-[44px]"
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
