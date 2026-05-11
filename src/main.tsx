import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { RootProvider } from '@/contexts/RootProvider';
import App from '@/App';
import { i18nReady } from './lib/i18n';
import './index.css';

// Init with only the lightweight tracing integration on the critical path.
// Session Replay (DOM observers, mutation buffering) and Profiling
// (sampling worker) do non-trivial setup, so they're added after first
// paint via requestIdleCallback below.
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: import.meta.env.PROD && !!import.meta.env.VITE_SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.1,
  profileSessionSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const initHeavySentryIntegrations = () => {
  if (!import.meta.env.PROD || !import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.addIntegration(Sentry.replayIntegration());
  Sentry.addIntegration(Sentry.browserProfilingIntegration());
};

const scheduleIdleWork = (cb: () => void) => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(cb, { timeout: 4000 });

    return;
  }
  setTimeout(cb, 2000);
};

scheduleIdleWork(initHeavySentryIntegrations);

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
