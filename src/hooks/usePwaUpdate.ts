import { useCallback, useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/useToast';
import { swRegistration } from '@/lib/swRegistration';
import { isSameBuildAsPage } from '@/lib/swBuildId';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const MIN_VISIBILITY_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export const usePwaUpdate = (): void => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const needRefreshRef = useRef(false);
  const lastUpdateCheckRef = useRef<number>(0);
  const toastDismissedRef = useRef(false);
  // Set once a reload-to-update came back still offering the same update — i.e.
  // the apply looped. While true, applyUpdate refuses to reload again so a bad
  // race can never become an endless loop.
  const updateStuckRef = useRef(false);

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

  // Shown when an update apply has looped (a reload landed back on the old
  // version). Deliberately has no action button: tapping reload is exactly
  // what loops. The reliable finish is a full close + reopen, which lets the
  // waiting worker activate on a clean boot with no client to race.
  const showStuckToast = useCallback((): void => {
    toast({
      id: 'pwa-update',
      title: t('pwa.stuckTitle'),
      description: t('pwa.stuckDescription'),
      duration: 10000,
    });
  }, [toast, t]);

  const applyUpdate = useCallback((): void => {
    // A previous apply already looped this session — reloading again would just
    // loop again. Point the user at the reliable finish instead.
    if (updateStuckRef.current) {
      showStuckToast();

      return;
    }

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

    // The reliable path: skipWaiting → activate → clients.claim() (run by
    // push-sw.js on this user-initiated SKIP_WAITING) → control transfers to the
    // new worker → `controllerchange` fires. forceReloadAfterSkipWaiting reloads
    // on that event, and otherwise waits until the new worker actually controls
    // the page before reloading — never blindly, so the reload can't land back on
    // the old precached app and loop.
    forceReloadAfterSkipWaiting();
  }, [updateServiceWorker, setNeedRefresh, showStuckToast]);

  const showUpdateToast = useCallback((): void => {
    toastDismissedRef.current = false;
    toast({
      // Stable id → at most one update toast ever exists; a repeat call
      // replaces it rather than stacking a second "Update available".
      id: 'pwa-update',
      title: t('pwa.updateAvailableTitle'),
      description: t('pwa.updateAvailableDescription'),
      duration: 15000,
      action: {
        label: t('common.update'),
        onClick: applyUpdate,
      },
      onDismiss() {
        toastDismissedRef.current = true;
      },
    });
  }, [toast, applyUpdate, t]);

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

    // We are being offered an update again moments after we reloaded to apply
    // one. That means the reload didn't take (it landed back on the old
    // version) — a loop. Break it: stop auto-applying and guide the user to a
    // clean finish instead of letting another reload restart the cycle.
    if (reloadedForUpdateRecently()) {
      updateStuckRef.current = true;
      setNeedRefresh(false);
      showStuckToast();

      return;
    }

    let cancelled = false;

    // A waiting worker alone doesn't prove there's anything new: iOS can
    // re-install the SAME bytes after killing the PWA process, parking an
    // identical worker in the waiting slot. Ask the worker for its build id
    // first — our own build re-installed is suppressed silently (it activates
    // harmlessly on the next full app close); anything unverifiable is
    // offered as before.
    const offerIfActuallyNewer = (worker: ServiceWorker): void => {
      void isSameBuildAsPage(worker).then((sameBuild) => {
        if (cancelled) return;

        if (sameBuild) {
          setNeedRefresh(false);

          return;
        }

        if (toastDismissedRef.current) return;
        showUpdateToast();
      });
    };

    // Fast path: a waiting worker is already observable.
    const reg = swRegistration.get();
    if (reg?.waiting) {
      offerIfActuallyNewer(reg.waiting);

      return () => {
        cancelled = true;
      };
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

      offerIfActuallyNewer(latest.waiting);
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [needRefresh, showUpdateToast, showStuckToast, setNeedRefresh]);

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

const CONTROL_TRANSFER_POLL_MS = 250;
const CONTROL_TRANSFER_HARD_CAP_MS = 10000;

// A genuine apply re-offers an update within a second or two of the reload (boot
// → update check → still-waiting worker). A legitimately new deploy lands far
// later. So "offered again inside this window" reliably means a loop, while the
// stamp self-expires and can't false-positive a real update minutes later.
const RELOAD_LOOP_WINDOW_MS = 30000;

// sessionStorage survives a reload but not a full app close (which is itself the
// escape hatch). We stamp the time right before reloading to apply an update;
// the needRefresh effect reads it to spot a reload that looped.
const UPDATE_RELOAD_FLAG = 'pwa-update-reloaded-at';

// After SKIP_WAITING is posted, reload onto the freshly activated worker — but
// only once it ACTUALLY controls the page. Reloading while the old worker still
// controls re-serves the old precached index.html, which re-detects the waiting
// worker and loops (the bug this guards against). So reload on `controllerchange`
// (the clean signal), and as a fallback poll the controller reference, since iOS
// standalone PWAs often transfer control without firing the event. Only after a
// hard cap do we reload regardless; the flag set here means even that pessimistic
// reload can loop at most once before the breaker trips. Reloads at most once.
const forceReloadAfterSkipWaiting = (): void => {
  let reloaded = false;

  const reload = (): void => {
    if (reloaded) return;
    reloaded = true;
    markUpdateReload();
    window.location.reload();
  };

  navigator.serviceWorker?.addEventListener('controllerchange', reload, {
    once: true,
  });

  const previousController = navigator.serviceWorker?.controller ?? null;
  const startedAt = Date.now();

  const poll = window.setInterval(() => {
    if (reloaded) {
      window.clearInterval(poll);

      return;
    }

    const controller = navigator.serviceWorker?.controller ?? null;
    const controlTransferred =
      controller !== null && controller !== previousController;
    if (controlTransferred) {
      window.clearInterval(poll);
      reload();

      return;
    }

    if (Date.now() - startedAt >= CONTROL_TRANSFER_HARD_CAP_MS) {
      window.clearInterval(poll);
      reload();
    }
  }, CONTROL_TRANSFER_POLL_MS);
};

const markUpdateReload = (): void => {
  try {
    sessionStorage.setItem(UPDATE_RELOAD_FLAG, String(Date.now()));
  } catch {
    // Private mode can throw on write — the reload still happens, we just lose
    // loop protection for this one attempt.
  }
};

// Read-and-clear: true if we reloaded to apply an update within the loop window.
// Clearing on read means each reload is judged exactly once.
const reloadedForUpdateRecently = (): boolean => {
  try {
    const raw = sessionStorage.getItem(UPDATE_RELOAD_FLAG);
    sessionStorage.removeItem(UPDATE_RELOAD_FLAG);
    if (raw === null) return false;

    const reloadedAt = Number(raw);

    return (
      Number.isFinite(reloadedAt) &&
      Date.now() - reloadedAt < RELOAD_LOOP_WINDOW_MS
    );
  } catch {
    return false;
  }
};
