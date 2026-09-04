import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { signOutEverywhere } from '@/lib/auth';
import {
  clearLock,
  isLockEnabled,
  loadLock,
  setBiometrics,
} from '@/lib/appLock';
import {
  enrolDeviceUnlock,
  forgetDeviceUnlock,
  isDeviceUnlockSupported,
} from '@/lib/deviceUnlock';
import { toast } from '@/hooks/useToast';

export const useSecuritySettings = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [isEnabled, setIsEnabled] = useState(() => isLockEnabled());
  const [usesDevice, setUsesDevice] = useState(
    () => loadLock()?.biometrics === true,
  );
  const [isDeviceSupported, setIsDeviceSupported] = useState(false);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [confirmSignOutAll, setConfirmSignOutAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void isDeviceUnlockSupported().then((supported) => {
      if (!cancelled) {
        setIsDeviceSupported(supported);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = (next: boolean) => {
    if (next) {
      setIsSettingPin(true);

      return;
    }

    clearLock();
    forgetDeviceUnlock();
    setIsEnabled(false);
    setUsesDevice(false);
  };

  const handleDeviceToggle = async (next: boolean) => {
    if (!next) {
      forgetDeviceUnlock();
      setBiometrics(false);
      setUsesDevice(false);

      return;
    }

    const enrolled = await enrolDeviceUnlock(session?.user?.id ?? 'budgard');
    if (!enrolled) {
      // Dismissing the system prompt is a decision, not an error — say what
      // happened and leave the switch where it was.
      toast({ title: t('security.device.notEnrolled') });

      return;
    }

    setBiometrics(true);
    setUsesDevice(true);
  };

  return {
    isEnabled,
    usesDevice,
    isDeviceSupported,
    isSettingPin,
    confirmSignOutAll,
    setConfirmSignOutAll,
    openPinDialog: () => setIsSettingPin(true),
    closePinDialog: () => setIsSettingPin(false),
    handleToggle,
    handleDeviceToggle,
    handlePinSaved: () => {
      setIsEnabled(true);
      setIsSettingPin(false);
      toast({ variant: 'success', title: t('security.lockToggle.saved') });
    },
    handleSignOutEverywhere: async () => {
      setConfirmSignOutAll(false);
      clearLock();
      forgetDeviceUnlock();
      await signOutEverywhere();
    },
  };
};
