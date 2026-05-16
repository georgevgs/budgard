import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Bell from 'lucide-react/dist/esm/icons/bell';

type PushState =
  | 'loading'
  | 'unsupported'
  | 'denied'
  | 'subscribed'
  | 'unsubscribed';

type TFunc = (key: string, options?: Record<string, unknown>) => string;

type NotificationsSectionProps = {
  pushState: PushState;
  dailyReminderHour: number | null;
  onPushSubscribe: () => Promise<void>;
  onPushUnsubscribe: () => Promise<void>;
  onDailyReminderToggle: (enabled: boolean) => void;
  onDailyReminderTimeChange: (localHour: number) => void;
  t: TFunc;
};

const NotificationsSection = ({
  pushState,
  dailyReminderHour,
  onPushSubscribe,
  onPushUnsubscribe,
  onDailyReminderToggle,
  onDailyReminderTimeChange,
  t,
}: NotificationsSectionProps) => {
  return (
    <section className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {t('settings.notifications.title')}
      </p>
      <Card>
        <CardContent className="p-4 space-y-4">
          {renderNotificationToggle(pushState, onPushSubscribe, onPushUnsubscribe, t)}
          {renderDailyReminder(
            pushState,
            dailyReminderHour,
            onDailyReminderToggle,
            onDailyReminderTimeChange,
            t,
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default NotificationsSection;

export const localToUtcHour = (localHour: number): number => {
  const d = new Date();
  d.setHours(localHour, 0, 0, 0);

  return d.getUTCHours();
};

// --- Helpers ---

const REMINDER_HOURS = Array.from({ length: 24 }, (_, i) => i);

const utcToLocalHour = (utcHour: number): number => {
  const d = new Date();
  d.setUTCHours(utcHour, 0, 0, 0);

  return d.getHours();
};

const formatHour = (hour: number): string => {
  return `${hour.toString().padStart(2, '0')}:00`;
};

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
  let localHour = 9;
  if (isEnabled) {
    localHour = utcToLocalHour(reminderHour);
  }

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
