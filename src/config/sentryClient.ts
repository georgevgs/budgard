import {
  init,
  browserTracingIntegration,
  captureException,
  setUser,
} from '@sentry/react';

// A narrow import surface keeps replay/profiling out of the diagnostics
// download. The heavy integrations remain in their own lazy module.
export const createSentryClient = () => {
  init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    enabled: import.meta.env.PROD && !!import.meta.env.VITE_SENTRY_DSN,
    integrations: [browserTracingIntegration()],
    tracesSampleRate: 0.1,
    profileSessionSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    ignoreErrors: [
      // Cloudflare Turnstile's bootstrap script triggers `eval` in some paths
      // (mostly older Safari). Our CSP intentionally omits `unsafe-eval`, so the
      // rejection bubbles up here as noise — Turnstile still works.
      /Refused to evaluate a string as JavaScript/,
      /'unsafe-eval' is not an allowed source/,
    ],
  });

  return { captureException, setUser };
};
