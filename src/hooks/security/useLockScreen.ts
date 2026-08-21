import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { haptics } from '@/lib/haptics';
import { loadLock, verifyPin, PIN_LENGTH } from '@/lib/appLock';
import {
  hasEnrolledCredential,
  requestDeviceUnlock,
} from '@/lib/deviceUnlock';

// How long the wrong-pin state stays on screen before the dots clear. Long
// enough to read the message, short enough not to be a punishment.
const ERROR_HOLD_MS = 700;

export const useLockScreen = (onUnlock: () => void) => {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [hasError, setHasError] = useState(false);
  const [coolingUntil, setCoolingUntil] = useState<number | null>(
    () => loadLock()?.lockedUntil ?? null,
  );

  const canUseDevice = loadLock()?.biometrics === true && hasEnrolledCredential();

  const tryDeviceUnlock = async () => {
    const ok = await requestDeviceUnlock();
    if (ok) {
      haptics.success();
      onUnlock();

      return;
    }

    setMessage(t('security.lock.deviceFailed'));
  };

  // Offer the device prompt as soon as the screen appears — the whole point of
  // enrolling is not to type a PIN. A failed or dismissed prompt falls back to
  // the keypad silently rather than shouting about it.
  useEffect(() => {
    if (!canUseDevice) {
      return;
    }

    let cancelled = false;
    void requestDeviceUnlock().then((ok) => {
      if (ok && !cancelled) {
        onUnlock();
      }
    });

    return () => {
      cancelled = true;
    };
    // Runs once when the lock screen mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (candidate: string) => {
    const result = await verifyPin(candidate);
    if (result.ok) {
      haptics.success();
      onUnlock();

      return;
    }

    haptics.error();
    setHasError(true);
    setCoolingUntil(result.lockedUntil);
    setMessage(messageFor(result.attemptsLeft, result.lockedUntil, t));
    window.setTimeout(() => {
      setPin('');
      setHasError(false);
    }, ERROR_HOLD_MS);
  };

  const press = (digit: number) => {
    if (hasError || isCoolingDown(coolingUntil)) {
      return;
    }

    haptics.selection();
    const next = `${pin}${digit}`;
    setPin(next);
    setMessage('');

    if (next.length === PIN_LENGTH) {
      void submit(next);
    }
  };

  return {
    pin,
    message,
    hasError,
    canUseDevice,
    isCoolingDown: isCoolingDown(coolingUntil),
    press,
    backspace: () => setPin((current) => current.slice(0, -1)),
    tryDeviceUnlock,
  };
};

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const isCoolingDown = (until: number | null): boolean => {
  if (until === null) {
    return false;
  }

  return Date.now() < until;
};

const messageFor = (
  attemptsLeft: number,
  lockedUntil: number | null,
  t: TFunc,
): string => {
  if (lockedUntil !== null) {
    return t('security.lock.cooldown', {
      minutes: Math.max(Math.ceil((lockedUntil - Date.now()) / 60_000), 1),
    });
  }

  return t('security.lock.wrong', { count: attemptsLeft });
};
