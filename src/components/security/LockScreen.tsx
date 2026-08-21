import { useTranslation } from 'react-i18next';
import Fingerprint from 'lucide-react/dist/esm/icons/fingerprint-pattern';
import { Button } from '@/components/ui/button';
import BrandMark from '@/components/common/BrandMark';
import PinPad from '@/components/security/PinPad';
import { useLockScreen } from '@/hooks/security/useLockScreen';
import { PIN_LENGTH } from '@/lib/appLock';
import { cn } from '@/lib/utils';

type Props = {
  onUnlock: () => void;
  onSignOut: () => void;
};

// Covers the whole app, above everything including dialogs. Deliberately not a
// route: locking must not touch history, or the back button would walk out of
// the lock and into whatever screen was underneath it.
const LockScreen = ({ onUnlock, onSignOut }: Props) => {
  const { t } = useTranslation();
  const lock = useLockScreen(onUnlock);

  return (
    <div
      className="fixed inset-0 z-200 flex flex-col items-center justify-center gap-6 bg-background px-6"
      role="dialog"
      aria-modal="true"
      aria-label={t('security.lock.title')}
    >
      <BrandMark className="h-10 w-10" />
      <p className="text-center text-sm text-muted-foreground">
        {t('security.lock.prompt')}
      </p>

      <div className="flex gap-3" aria-hidden="true">
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <span
            key={index}
            className={cn(
              'h-3.5 w-3.5 rounded-full transition-colors',
              dotTone(index < lock.pin.length, lock.hasError),
            )}
          />
        ))}
      </div>

      <p
        className="min-h-5 text-center text-sm font-medium text-destructive-ink"
        role="alert"
      >
        {lock.message}
      </p>

      <PinPad
        onPress={lock.press}
        onBackspace={lock.backspace}
        disabled={lock.isCoolingDown}
      />

      <div className="flex flex-col items-center gap-1">
        {renderBiometricButton(lock, t)}
        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground"
          onClick={onSignOut}
        >
          {t('security.lock.signOut')}
        </Button>
      </div>
    </div>
  );
};

export default LockScreen;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;
type Lock = ReturnType<typeof useLockScreen>;

const dotTone = (filled: boolean, hasError: boolean): string => {
  if (hasError) {
    return 'bg-destructive';
  }
  if (filled) {
    return 'bg-foreground';
  }

  return 'bg-muted-foreground/25';
};

const renderBiometricButton = (lock: Lock, t: TFunc) => {
  if (!lock.canUseDevice) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={lock.tryDeviceUnlock}
      disabled={lock.isCoolingDown}
    >
      <Fingerprint className="mr-2 h-4 w-4" />
      {t('security.lock.useDevice')}
    </Button>
  );
};
