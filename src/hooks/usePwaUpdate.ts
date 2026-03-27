import { useCallback, useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '@/hooks/useToast';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function usePwaUpdate(): void {
  const { toast } = useToast();
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const needRefreshRef = useRef(false);

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
        try {
          if (registration.installing || !navigator) return;
          if ('connection' in navigator && !navigator.onLine) return;

          const resp = await fetch(_swUrl, {
            cache: 'no-store',
            headers: {
              cache: 'no-store',
              'cache-control': 'no-cache',
            },
          });

          if (resp?.status === 200) {
            await registration.update();
          }
        } catch {
          // Network failures are expected (offline, flaky connection)
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

  const showUpdateToast = useCallback((): void => {
    toast({
      title: 'Update available',
      description: 'A new version is ready.',
      duration: 15000,
      action: {
        label: 'Update',
        onClick: applyUpdate,
      },
    });
  }, [toast, applyUpdate]);

  // Keep ref in sync so the visibility handler can read it
  useEffect(() => {
    needRefreshRef.current = needRefresh;
  }, [needRefresh]);

  // Show toast immediately when an update is first detected
  useEffect(() => {
    if (!needRefresh) return;
    showUpdateToast();
  }, [needRefresh, showUpdateToast]);

  // Check for SW updates when the app returns to foreground.
  // iOS freezes the web view when backgrounded and doesn't automatically
  // check for SW updates on resume. visibilitychange is the most reliable
  // event that fires when a standalone PWA is foregrounded.
  // Also re-shows the update toast if a pending update was previously
  // dismissed, so the user gets another chance to apply it.
  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (document.visibilityState !== 'visible') return;

      if (needRefreshRef.current) {
        showUpdateToast();

        return;
      }

      const registration = swRegistrationRef.current;
      if (!registration) return;

      registration.update().catch(() => {
        // SW script fetch can fail (offline, server error) — non-critical
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [showUpdateToast]);
}
