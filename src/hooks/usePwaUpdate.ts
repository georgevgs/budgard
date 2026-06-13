import { useCallback, useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '@/hooks/useToast';
import { swRegistration } from '@/lib/swRegistration';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const MIN_VISIBILITY_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export const usePwaUpdate = (): void => {
  const { toast } = useToast();
  const needRefreshRef = useRef(false);
  const lastUpdateCheckRef = useRef<number>(0);
  const toastDismissedRef = useRef(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
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
    const reg = swRegistration.get();
    // iOS PWA can leave needRefresh=true with no waiting SW after a
    // same-content reinstall. Calling updateServiceWorker(true) here would
    // silently no-op (no SKIP_WAITING target → no controllerchange → no
    // reload), so the toast would just close and return on next app open.
    // Clear the flag instead.
    if (!reg?.waiting) {
      setNeedRefresh(false);

      return;
    }

    // Hand off to vite-plugin-pwa: posts SKIP_WAITING to the waiting worker.
    updateServiceWorker(true);

    // Guarantee the waiting worker is actually consumed. vite-plugin-pwa only
    // reloads on its internal `controlling` event gated by `isUpdate`, which
    // is unreliable on iOS standalone PWAs — when it doesn't fire, the worker
    // stays waiting and the prompt reappears on every app open. skipWaiting
    // still moves the new worker to "activated", so a manual reload picks it
    // up. Reload as soon as control changes, with a timed fallback for the
    // platforms where controllerchange never fires.
    forceReloadAfterSkipWaiting();
  }, [updateServiceWorker, setNeedRefresh]);

  const showUpdateToast = useCallback((): void => {
    toastDismissedRef.current = false;
    toast({
      // Stable id → at most one update toast ever exists; a repeat call
      // replaces it rather than stacking a second "Update available".
      id: 'pwa-update',
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

    // Fast path: a waiting worker is already observable, show immediately.
    const reg = swRegistration.get();
    if (reg?.waiting) {
      if (toastDismissedRef.current) return;
      showUpdateToast();

      return;
    }

    // Slow path: needRefresh fired but registration.waiting hasn't been
    // populated yet. This happens via vite-plugin-pwa's `installed` +
    // `isExternal` path (fires before the 200ms-confirmed `waiting` event),
    // and on iOS PWA same-content reinstalls where the worker never reaches
    // a true waiting state. Wait briefly, then re-check; if still no waiting
    // worker, treat as a phantom and clear the flag.
    const timer = setTimeout(() => {
      const latest = swRegistration.get();
      if (!latest?.waiting) {
        setNeedRefresh(false);

        return;
      }

      if (toastDismissedRef.current) return;
      showUpdateToast();
    }, 1500);

    return () => clearTimeout(timer);
  }, [needRefresh, showUpdateToast, setNeedRefresh]);

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
};

// --- Helpers ---

const FORCE_RELOAD_FALLBACK_MS = 3000;

// After SKIP_WAITING is posted, reload so the freshly activated worker takes
// control. Reload immediately on controllerchange; if it never fires (iOS),
// reload anyway after a short delay. Guarded so we reload at most once.
const forceReloadAfterSkipWaiting = (): void => {
  let reloaded = false;

  const reload = () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  };

  navigator.serviceWorker?.addEventListener('controllerchange', reload, {
    once: true,
  });

  setTimeout(reload, FORCE_RELOAD_FALLBACK_MS);
};
