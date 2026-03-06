import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { RootProvider } from '@/contexts/RootProvider';
import App from '@/App';
import './lib/i18n';
import './index.css';

// Clear the SW reset flag — app booted successfully, future stale-cache issues can auto-fix again.
sessionStorage.removeItem('budgard-sw-reset');

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: import.meta.env.PROD && !!import.meta.env.VITE_SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.1,
});

// Recover from stale SW cache causing chunk load failures (common on iOS PWA after
// a deployment while the app was backgrounded — old JS tries to load old chunk hashes
// that no longer exist in the new SW precache).
// We track attempts in sessionStorage to avoid an infinite loop, but cap at 1 reload.
// We use location.href assignment instead of location.reload() to bypass iOS bfcache.
const SW_RELOAD_KEY = 'sw-chunk-reload';
const reloadAttempts = Number(sessionStorage.getItem(SW_RELOAD_KEY) ?? '0');
if (reloadAttempts < 1) {
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const msg: string = event.reason?.message ?? '';
    const isChunkLoadError =
      msg.includes('dynamically imported module') ||
      msg.includes('Importing a module script failed');
    if (isChunkLoadError) {
      sessionStorage.setItem(SW_RELOAD_KEY, String(reloadAttempts + 1));
      // Use href assignment to force a full navigation, bypassing iOS PWA bfcache.
      window.location.href = window.location.href;
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootProvider>
      <App />
    </RootProvider>
  </StrictMode>,
);
