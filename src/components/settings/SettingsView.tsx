import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useDataConfig } from '@/contexts/DataContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useSettingsHandlers } from '@/hooks/settings/useSettingsHandlers';
import AppearanceSection from '@/components/settings/AppearanceSection';
import NotificationsSection from '@/components/settings/NotificationsSection';
import ProfileSection from '@/components/settings/ProfileSection';
import DataManagementSection from '@/components/settings/DataManagementSection';
import LanguageSection from '@/components/settings/LanguageSection';
import CurrencySection from '@/components/settings/CurrencySection';
import AboutSection from '@/components/settings/AboutSection';

const SettingsView = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { dailyReminderHour, notificationPreferences } = useDataConfig();
  const {
    state: pushState,
    subscribe: pushSubscribe,
    unsubscribe: pushUnsubscribe,
  } = usePushNotifications();
  const handlers = useSettingsHandlers();

  return (
    <div className="container max-w-lg mx-auto p-4 pb-12 space-y-8">
      <h2 className="text-lg font-semibold tracking-tight">
        {t('settings.title')}
      </h2>

      <ProfileSection
        email={session?.user?.email}
        onSignOut={handlers.handleSignOut}
        t={t}
      />

      <AppearanceSection
        theme={handlers.theme}
        accent={handlers.accent}
        isHapticsSupported={handlers.isHapticsSupported}
        hapticsEnabled={handlers.hapticsEnabled}
        onThemeSelect={handlers.handleThemeSelect}
        onAccentSelect={handlers.handleAccentSelect}
        onHapticsToggle={handlers.handleHapticsToggle}
        t={t}
      />

      <LanguageSection />

      <CurrencySection />

      <NotificationsSection
        pushState={pushState}
        dailyReminderHour={dailyReminderHour}
        notificationPreferences={notificationPreferences}
        onPushSubscribe={pushSubscribe}
        onPushUnsubscribe={pushUnsubscribe}
        onDailyReminderToggle={handlers.handleDailyReminderToggle}
        onDailyReminderTimeChange={handlers.handleDailyReminderTimeChange}
        onPreferenceToggle={handlers.handlePreferenceToggle}
        t={t}
      />

      <DataManagementSection
        onConfirmDelete={handlers.handleConfirmDelete}
        isDeleting={handlers.isDeleting}
        t={t}
      />

      <AboutSection />
    </div>
  );
};

export default SettingsView;
