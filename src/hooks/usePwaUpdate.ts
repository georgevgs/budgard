import { useCallback, useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '@/hooks/useToast';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function usePwaUpdate(): void {
  const { toast } = useToast();
  const toastShownRef = useRef(false);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      swRegistrationRef.current = registration;

      // Periodic update check — fetch the SW file with no-cache to detect
      // new deployments, then call update() if the server has a new version.
      setInterval(async () => {
        if (registration.installing || !navigator) return;
        if ('connection' in navigator && !navigator.onLine) return;

        const resp = await fetch(_swUrl, {
          cache: 'no-store',
          headers: {
            'cache': 'no-store',
            'cache-control': 'no-cache',
          },
        });

        if (resp?.status === 200) {
          await registration.update();
        }
      }, UPDATE_CHECK_INTERVAL_MS);
    },
    onRegisterError() {
      // Registration failures are non-critical — the app works without SW
    },
  });

  const applyUpdate = useCallback((): void => {
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  // Show a persistent toast when an update is available
  useEffect(() => {
    if (!needRefresh || toastShownRef.current) return;

    toastShownRef.current = true;
    toast({
      title: 'Update available',
      description: 'A new version is ready.',
      duration: Infinity,
      action: {
        label: 'Update',
        onClick: applyUpdate,
      },
    });
  }, [needRefresh, toast, applyUpdate]);

  // iOS PWA: check for SW updates when the app returns to foreground.
  // iOS freezes the web view when backgrounded and doesn't automatically
  // check for SW updates on resume. visibilitychange is the most reliable
  // event that fires when an iOS standalone PWA is foregrounded.
  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (document.visibilityState !== 'visible') return;

      const registration = swRegistrationRef.current;
      if (!registration) return;

      registration.update();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
