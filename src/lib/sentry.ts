/**
 * Lightweight facade over `@sentry/react` so the SDK (~355 KB min) stays out
 * of the entry bundle. App code imports this module instead of the SDK.
 *
 * Until `loadSentry()` finishes, calls are buffered in a bounded queue and
 * replayed in order once the real SDK is ready. If the SDK never loads
 * (offline PWA boot, blocked CDN), every export stays a safe no-op.
 *
 * IMPORTANT: this module must never statically import '@sentry/react' —
 * only the `await import()` inside `loadSentry` may reference it, so the
 * SDK lands in its own lazy chunk instead of the critical path.
 */

type SentrySdk = typeof import('@sentry/react');

type QueuedCall =
  | { method: 'captureException'; args: Parameters<SentrySdk['captureException']> }
  | { method: 'setUser'; args: Parameters<SentrySdk['setUser']> };

const QUEUE_LIMIT = 50;

let sdk: SentrySdk | null = null;
let queuedCalls: QueuedCall[] = [];

export const captureException = (
  ...args: Parameters<SentrySdk['captureException']>
): void => {
  if (sdk) {
    sdk.captureException(...args);

    return;
  }

  enqueue({ method: 'captureException', args });
};

export const setUser = (...args: Parameters<SentrySdk['setUser']>): void => {
  if (sdk) {
    sdk.setUser(...args);

    return;
  }

  enqueue({ method: 'setUser', args });
};

/**
 * Dynamically imports the SDK, runs init, then flushes the queue in order.
 * Init uses only the lightweight tracing integration — Session Replay and
 * Profiling do non-trivial setup, so they're added later via the separate
 * `sentryHeavy` chunk (see src/main.tsx).
 *
 * Never throws: Sentry is best-effort and a failed load must not surface.
 * Resolves `true` only when the SDK is ready.
 */
export const loadSentry = async (): Promise<boolean> => {
  if (sdk) {
    return true;
  }

  try {
    const module = await import('@sentry/react');

    module.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      enabled: import.meta.env.PROD && !!import.meta.env.VITE_SENTRY_DSN,
      integrations: [module.browserTracingIntegration()],
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

    sdk = module;
    flushQueue(module);

    return true;
  } catch {
    // Swallow: the queue stays intact (still bounded) so a later
    // `loadSentry` retry can deliver buffered events.
    return false;
  }
};

// --- Helpers ---

const enqueue = (call: QueuedCall): void => {
  if (queuedCalls.length >= QUEUE_LIMIT) {
    return;
  }

  queuedCalls.push(call);
};

const flushQueue = (module: SentrySdk): void => {
  const pending = queuedCalls;
  queuedCalls = [];

  for (const call of pending) {
    if (call.method === 'captureException') {
      module.captureException(...call.args);
      continue;
    }

    module.setUser(...call.args);
  }
};
