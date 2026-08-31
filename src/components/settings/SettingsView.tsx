import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import Bell from 'lucide-react/dist/esm/icons/bell';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import CircleUserRound from 'lucide-react/dist/esm/icons/circle-user-round';
import Database from 'lucide-react/dist/esm/icons/database';
import Landmark from 'lucide-react/dist/esm/icons/landmark';
import Palette from 'lucide-react/dist/esm/icons/palette';
import UsersRound from 'lucide-react/dist/esm/icons/users-round';
import { useAuth } from '@/contexts/AuthContext';
import { useDataConfig } from '@/contexts/DataContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useSettingsHandlers } from '@/hooks/settings/useSettingsHandlers';
import PageHeader from '@/components/common/PageHeader';
import AboutSection from '@/components/settings/AboutSection';
import AppearanceSection from '@/components/settings/AppearanceSection';
import BillingSection from '@/components/settings/BillingSection';
import CurrencySection from '@/components/settings/CurrencySection';
import AnnualExportSection from '@/components/settings/AnnualExportSection';
import DataManagementSection from '@/components/settings/DataManagementSection';
import LanguageSection from '@/components/settings/LanguageSection';
import NotificationsSection from '@/components/settings/NotificationsSection';
import ProfileSection from '@/components/settings/ProfileSection';
import SecuritySection from '@/components/settings/SecuritySection';
import HouseholdSection from '@/components/settings/HouseholdSection';
import ConnectionsSection from '@/components/settings/ConnectionsSection';

type SettingsSection =
  | 'account'
  | 'household'
  | 'connections'
  | 'preferences'
  | 'notifications'
  | 'data';

// Settings is an index first. Low-frequency controls live on named routes, so
// a person scans four decisions instead of nine full sections and each group
// has its own history entry, page title and reliable way back.
const SettingsView = () => {
  const { t } = useTranslation();
  const auth = useAuth();
  const config = useDataConfig();
  const push = usePushNotifications();
  const handlers = useSettingsHandlers();
  const { section: rawSection } = useParams();
  let section: SettingsSection | null = null;

  if (rawSection) {
    section = resolveSection(rawSection);
    if (!section) {
      return <Navigate to="/settings" replace />;
    }
  }

  const header = resolveHeader(section, t);

  return (
    <div className="page-shell pb-12">
      <PageHeader title={header.title} subtitle={header.subtitle} />
      <div className="mt-8">
        {renderContent(section, { auth, config, push, handlers, t })}
      </div>
    </div>
  );
};

export default SettingsView;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;
type SettingsData = {
  auth: ReturnType<typeof useAuth>;
  config: ReturnType<typeof useDataConfig>;
  push: ReturnType<typeof usePushNotifications>;
  handlers: ReturnType<typeof useSettingsHandlers>;
  t: TFunc;
};

type Group = {
  section: SettingsSection;
  icon: ComponentType<{ className?: string }>;
};

const GROUPS: Group[] = [
  { section: 'account', icon: CircleUserRound },
  { section: 'household', icon: UsersRound },
  { section: 'connections', icon: Landmark },
  { section: 'preferences', icon: Palette },
  { section: 'notifications', icon: Bell },
  { section: 'data', icon: Database },
];

const resolveSection = (value: string): SettingsSection | null => {
  const match = GROUPS.find((group) => group.section === value);
  if (!match) {
    return null;
  }

  return match.section;
};

const resolveHeader = (section: SettingsSection | null, t: TFunc) => {
  if (!section) {
    return {
      title: t('settings.title'),
      subtitle: t('settings.subtitle'),
    };
  }

  return {
    title: t(`settings.groups.${section}.title`),
    subtitle: t(`settings.groups.${section}.description`),
  };
};

const renderContent = (section: SettingsSection | null, data: SettingsData) => {
  if (!section) {
    return renderIndex(data.t);
  }
  if (section === 'account') {
    return renderAccount(data);
  }
  if (section === 'preferences') {
    return renderPreferences(data);
  }
  if (section === 'notifications') {
    return renderNotifications(data);
  }
  if (section === 'household') {
    return <HouseholdSection />;
  }
  if (section === 'connections') {
    return <ConnectionsSection />;
  }

  return renderData(data);
};

const renderIndex = (t: TFunc) => (
  <div className="space-y-8">
    <nav
      className="surface-card-flush divide-y divide-border/40"
      aria-label={t('settings.title')}
    >
      {GROUPS.map((group) => renderGroupLink(group, t))}
    </nav>
    <AboutSection />
  </div>
);

const renderGroupLink = (group: Group, t: TFunc) => {
  const Icon = group.icon;

  return (
    <Link
      key={group.section}
      to={`/settings/${group.section}`}
      viewTransition
      className="group flex min-h-20 items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary-ink">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">
          {t(`settings.groups.${group.section}.title`)}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
          {t(`settings.groups.${group.section}.description`)}
        </span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
};

const renderAccount = (data: SettingsData) => (
  <div className="space-y-8">
    <ProfileSection
      email={data.auth.session?.user?.email}
      onSignOut={data.handlers.handleSignOut}
      t={data.t}
    />
    <BillingSection />
  </div>
);

const renderPreferences = (data: SettingsData) => (
  <div className="space-y-8">
    <AppearanceSection
      theme={data.handlers.theme}
      accent={data.handlers.accent}
      isHapticsSupported={data.handlers.isHapticsSupported}
      hapticsEnabled={data.handlers.hapticsEnabled}
      onThemeSelect={data.handlers.handleThemeSelect}
      onAccentSelect={data.handlers.handleAccentSelect}
      onHapticsToggle={data.handlers.handleHapticsToggle}
      t={data.t}
    />
    <LanguageSection />
    <CurrencySection />
  </div>
);

const renderNotifications = (data: SettingsData) => (
  <div className="space-y-8">
    <NotificationsSection
      pushState={data.push.state}
      dailyReminderHour={data.config.dailyReminderHour}
      notificationPreferences={data.config.notificationPreferences}
      onPushSubscribe={data.push.subscribe}
      onPushUnsubscribe={data.push.unsubscribe}
      onDailyReminderToggle={data.handlers.handleDailyReminderToggle}
      onDailyReminderTimeChange={data.handlers.handleDailyReminderTimeChange}
      onPreferenceToggle={data.handlers.handlePreferenceToggle}
      t={data.t}
    />
    <SecuritySection />
  </div>
);

const renderData = (data: SettingsData) => (
  <div className="space-y-8">
    <DataManagementSection
      onConfirmDelete={data.handlers.handleConfirmDelete}
      isDeleting={data.handlers.isDeleting}
      t={data.t}
    />
    <AnnualExportSection />
  </div>
);
