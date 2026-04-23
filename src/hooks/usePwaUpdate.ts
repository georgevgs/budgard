import { useCallback, useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '@/hooks/useToast';
import { swRegistration } from '@/lib/swRegistration';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const MIN_VISIBILITY_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export function usePwaUpdate(): void {
  const { toast } = useToast();
  const needRefreshRef = useRef(false);
  const lastUpdateCheckRef = useRef<number>(0);
  const toastDismissedRef = useRef(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      swRegistration.set(registration);

      // Check for an update immediately on registration.
      // visibilitychange doesn't fire on a fresh iOS PWA open (page starts
      // already visible), and the periodic interval hasn't fired yet —
      // so without this call nothing would trigger a SW update check on open.
      lastUpdateCheckRef.current = Date.now();
      registration.update().catch(() => {});

      // Periodic update check — registration.update() fetches the SW file
      // and does a byte-for-byte comparison. Chrome 68+ bypasses HTTP cache
      // for SW files automatically; no manual fetch needed.
      setInterval(() => {
        if (registration.installing || !navigator) return;
        if ('connection' in navigator && !navigator.onLine) return;

        registration.update().catch(() => {});
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
    toastDismissedRef.current = false;
    toast({
      title: 'Update available',
      description: 'A new version is ready.',
      duration: 15000,
      action: {
        label: 'Update',
        onClick: applyUpdate,
      },
      onDismiss() {
        toastDismissedRef.current = true;
      },
    });
  }, [toast, applyUpdate]);

  // Keep ref in sync so the visibility handler can read it
  useEffect(() => {
    needRefreshRef.current = needRefresh;
  }, [needRefresh]);

  // Show toast when an update is first detected.
  // Only fires on a genuine false → true transition of needRefresh.
  // If the user already dismissed the toast for this update, skip.
  useEffect(() => {
    if (!needRefresh) {
      // needRefresh went back to false — reset dismissal so a future
      // new update will show the toast again.
      toastDismissedRef.current = false;
      return;
    }
    if (toastDismissedRef.current) return;
    showUpdateToast();
  }, [needRefresh, showUpdateToast]);

  // Check for SW updates when the app returns to foreground.
  // iOS freezes the web view when backgrounded and doesn't automatically
  // check for SW updates on resume. visibilitychange is the most reliable
  // event that fires when a standalone PWA is foregrounded.
  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (document.visibilityState !== 'visible') return;

      // If an update is already pending, don't re-check or re-show toast.
      if (needRefreshRef.current) return;

      const reg = swRegistration.get();
      if (!reg) return;

      // Rate-limit update checks on visibility change to avoid iOS triggering
      // spurious SW re-installs on every app focus event.
      const now = Date.now();
      if (now - lastUpdateCheckRef.current < MIN_VISIBILITY_CHECK_INTERVAL_MS) {
        return;
      }
      lastUpdateCheckRef.current = now;

      reg.update().catch(() => {
        // SW script fetch can fail (offline, server error) — non-critical
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
