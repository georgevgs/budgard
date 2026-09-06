import { useState, useEffect } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type InstallPromptState = {
  isIosSafari: boolean;
  isAndroidInstallable: boolean;
  isStandalone: boolean;
  triggerAndroidInstall: () => Promise<void>;
};

const detectIosSafari = (): boolean => {
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  // Exclude Chrome (CriOS), Firefox (FxiOS), and other non-Safari iOS browsers
  const isSafari = /safari/i.test(ua) && !/crios|fxios|opios|edgios/i.test(ua);

  return isIos && isSafari;
};

const detectStandalone = (): boolean => {
  const mediaQuery = window.matchMedia('(display-mode: standalone)').matches;
  const iosProp =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return mediaQuery || iosProp;
};

export const useInstallPrompt = (): InstallPromptState => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () =>
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const triggerAndroidInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return {
    isIosSafari: detectIosSafari(),
    isAndroidInstallable: !!deferredPrompt,
    isStandalone: detectStandalone(),
    triggerAndroidInstall,
  };
};
