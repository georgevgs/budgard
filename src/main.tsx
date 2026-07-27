import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RootProvider } from '@/contexts/RootProvider';
import App from '@/App';
import { i18nReady } from '@/lib/i18n';
import { captureException, loadSentry } from '@/lib/sentry';
import './index.css';

// The Sentry SDK loads lazily (see the idle scheduling below), so genuinely
// early crashes would otherwise be lost. Stash them with plain listeners
// right away; once the SDK is up they're forwarded and the listeners removed.
const EARLY_CRASH_LIMIT = 50;
const earlyCrashes: unknown[] = [];

const stashEarlyCrash = (value: unknown) => {
  if (earlyCrashes.length >= EARLY_CRASH_LIMIT) {
    return;
  }

  earlyCrashes.push(value);
};

const onEarlyError = (event: ErrorEvent) => {
  stashEarlyCrash(event.error ?? event.message);
};

const onEarlyRejection = (event: PromiseRejectionEvent) => {
  stashEarlyCrash(event.reason);
};

window.addEventListener('error', onEarlyError);
window.addEventListener('unhandledrejection', onEarlyRejection);

const forwardEarlyCrashes = () => {
  // Remove first so the SDK's own global handlers are the single reporter
  // for anything that fires from here on.
  window.removeEventListener('error', onEarlyError);
  window.removeEventListener('unhandledrejection', onEarlyRejection);

  for (const crash of earlyCrashes) {
    captureException(crash);
  }
  earlyCrashes.length = 0;
};

const scheduleIdleWork = (cb: () => void) => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(cb, { timeout: 4000 });

    return;
  }
  setTimeout(cb, 2000);
};

// The whole Sentry SDK stays off the critical path: `loadSentry` dynamically
// imports it at idle, runs init (lightweight tracing integration only), then
// flushes calls buffered by the facade. Session Replay (DOM observers,
// mutation buffering) and Profiling (sampling worker) do non-trivial setup,
// so they chain after init via their own chunk.
scheduleIdleWork(() => {
  if (!import.meta.env.PROD || !import.meta.env.VITE_SENTRY_DSN) {
    return;
  }

  loadSentry().then((loaded) => {
    forwardEarlyCrashes();
    if (!loaded) {
      return;
    }

    import('@/lib/sentryHeavy')
      .then((m) => m.initHeavySentryIntegrations())
      .catch(() => {
        // Best-effort: replay/profiling must never block or break the app.
      });
  });
});

// Recover from stale SW cache causing chunk load failures (common on iOS PWA after
// a deployment while the app was backgrounded — old JS tries to load old chunk hashes
// that no longer exist in the new SW precache).
// We track attempts in sessionStorage to avoid an infinite loop, but cap at 1 reload.
// We use location.href assignment instead of location.reload() to bypass iOS bfcache.
const SW_RELOAD_KEY = 'sw-chunk-reload';
const reloadAttempts = Number(sessionStorage.getItem(SW_RELOAD_KEY) ?? '0');
if (reloadAttempts < 1) {
  window.addEventListener(
    'unhandledrejection',
    (event: PromiseRejectionEvent) => {
      const msg: string = event.reason?.message ?? '';
      const isChunkLoadError =
        msg.includes('dynamically imported module') ||
        msg.includes('Importing a module script failed');
      if (isChunkLoadError) {
        sessionStorage.setItem(SW_RELOAD_KEY, String(reloadAttempts + 1));
        // Use href assignment to force a full navigation, bypassing iOS PWA bfcache.
        window.location.assign(window.location.href);
      }
    },
  );
}

i18nReady.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RootProvider>
        <App />
      </RootProvider>
    </StrictMode>,
  );
});
