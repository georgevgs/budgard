import { useTranslation } from 'react-i18next';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import SurfaceCard from '@/components/common/SurfaceCard';
import SetPinDialog from '@/components/security/SetPinDialog';
import ConfirmDestructiveDialog from '@/components/common/ConfirmDestructiveDialog';
import { useSecuritySettings } from '@/hooks/security/useSecuritySettings';

const SecuritySection = () => {
  const { t } = useTranslation();
  const security = useSecuritySettings();

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {t('security.title')}
      </p>
      <SurfaceCard>
        <div className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium" id="app-lock-label">
                {t('security.lockToggle.label')}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {t('security.lockToggle.description')}
              </p>
            </div>
            <Switch
              checked={security.isEnabled}
              onCheckedChange={security.handleToggle}
              aria-labelledby="app-lock-label"
            />
          </div>

          {renderDeviceUnlock(security, t)}
          {renderChangePin(security, t)}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="space-y-3 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-income-ink" aria-hidden="true" />
            {t('security.sessions.label')}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t('security.sessions.description')}
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full"
            onClick={() => security.setConfirmSignOutAll(true)}
          >
            {t('security.sessions.signOutEverywhere')}
          </Button>
        </div>
      </SurfaceCard>

      {/* Plain language, not a legal page: what the lock does and does not do.
          Overstating it would be worse than not having it. */}
      <p className="px-1 text-xs leading-relaxed text-muted-foreground">
        {t('security.disclosure')}
      </p>

      <SetPinDialog
        open={security.isSettingPin}
        onClose={security.closePinDialog}
        onSaved={security.handlePinSaved}
      />
      <ConfirmDestructiveDialog
        open={security.confirmSignOutAll}
        title={t('security.sessions.signOutEverywhere')}
        description={t('security.sessions.signOutConfirm')}
        confirmLabel={t('security.sessions.signOutEverywhere')}
        onOpenChange={(open) => {
          if (!open) {
            security.setConfirmSignOutAll(false);
          }
        }}
        onConfirm={security.handleSignOutEverywhere}
      />
    </section>
  );
};

export default SecuritySection;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;
type Security = ReturnType<typeof useSecuritySettings>;

// Only offered where the device actually has a biometric or passcode to check
// against — an unavailable toggle that always fails is worse than no toggle.
const renderDeviceUnlock = (security: Security, t: TFunc) => {
  if (!security.isEnabled || !security.isDeviceSupported) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-4 border-t border-border/40 pt-4">
      <div className="min-w-0">
        <p className="text-sm font-medium" id="device-unlock-label">
          {t('security.device.label')}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {t('security.device.description')}
        </p>
      </div>
      <Switch
        checked={security.usesDevice}
        onCheckedChange={security.handleDeviceToggle}
        aria-labelledby="device-unlock-label"
      />
    </div>
  );
};

const renderChangePin = (security: Security, t: TFunc) => {
  if (!security.isEnabled) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full rounded-full"
      onClick={security.openPinDialog}
    >
      {t('security.changePin')}
    </Button>
  );
};
