import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/common/contexts/AuthContext';
import { authApi } from '@/common/api/authApi';
import {
  clearLock,
  isLockEnabled,
  loadLock,
  setBiometrics,
} from '@/constants/appLock';
import {
  enrolDeviceUnlock,
  forgetDeviceUnlock,
  isDeviceUnlockSupported,
} from '@/constants/deviceUnlock';
import { toast } from '@/common/hooks/useToast';

export const useSecuritySettings = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [isEnabled, setIsEnabled] = useState(() => isLockEnabled());
  const [usesDevice, setUsesDevice] = useState(
    () => loadLock()?.biometrics === true,
  );
  const [isDeviceSupported, setIsDeviceSupported] = useState(false);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [isConfirmingSignOutAll, setIsConfirmingSignOutAll] = useState(false);

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
    isConfirmingSignOutAll,
    setIsConfirmingSignOutAll,
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
      setIsConfirmingSignOutAll(false);
      clearLock();
      forgetDeviceUnlock();
      await authApi.signOutEverywhere();
    },
  };
};
