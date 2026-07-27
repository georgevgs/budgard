// Build-identity handshake with a waiting service worker.
//
// iOS/WebKit occasionally re-installs a byte-identical service worker after
// the PWA process was killed (script-cache eviction on resume). That parks a
// worker in the waiting slot that is NOT a new version, and a prompt gated
// only on "a waiting worker exists" announces a false update. push-sw.js is
// stamped at build time with the same build id the app bundle receives via
// Vite `define`; asking the waiting worker for its id tells the two cases
// apart. Every uncertain outcome (old worker without the handler, timeout,
// unstamped dev build) deliberately fails OPEN — offering an update we can't
// verify is annoying, suppressing a real one is broken.

const REPLY_TIMEOUT_MS = 1200;

export const getPageBuildId = (): string | null => {
  if (typeof __BUILD_ID__ !== 'string') return null;

  return __BUILD_ID__;
};

// Ask a (waiting) service worker for the build id stamped into push-sw.js.
// Resolves null when the worker doesn't answer in time (workers deployed
// before this handshake existed have no GET_BUILD_ID handler), replies with
// something unexpected, or can't be messaged at all (became redundant).
export const requestWaitingBuildId = (
  worker: ServiceWorker,
  timeoutMs: number = REPLY_TIMEOUT_MS
): Promise<string | null> =>
  new Promise((resolve) => {
    const channel = new MessageChannel();

    const finish = (value: string | null): void => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(value);
    };

    const timer = setTimeout(() => {
      finish(null);
    }, timeoutMs);

    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      if (typeof event.data === 'string') {
        finish(event.data);

        return;
      }

      finish(null);
    };

    try {
      worker.postMessage({ type: 'GET_BUILD_ID' }, [channel.port2]);
    } catch {
      finish(null);
    }
  });

// Pure comparison, exported for tests. Only two comparable ids may suppress
// a prompt; anything unknown is treated as "different" (fail open).
export const compareBuildIds = (
  pageBuildId: string | null,
  workerBuildId: string | null
): boolean => {
  if (!isComparableBuildId(pageBuildId)) return false;
  if (!isComparableBuildId(workerBuildId)) return false;

  return pageBuildId === workerBuildId;
};

// True only when the waiting worker provably carries the SAME build as the
// running page — the one case where the update prompt must be suppressed.
export const isSameBuildAsPage = async (worker: ServiceWorker): Promise<boolean> => {
  const pageBuildId = getPageBuildId();
  if (!isComparableBuildId(pageBuildId)) return false;

  const workerBuildId = await requestWaitingBuildId(worker);

  return compareBuildIds(pageBuildId, workerBuildId);
};

// --- Helpers ---

// 'dev' is the fallback id of builds made without git; two unrelated dev
// builds would match each other and wrongly suppress real updates while
// testing service-worker flows locally.
const isComparableBuildId = (value: string | null): value is string => {
  if (value === null) return false;
  if (value.length === 0) return false;

  return value !== 'dev';
};
