import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const RESET_DEADLINE_MS = 4000;
const resetScript = readFileSync(
  path.resolve(import.meta.dirname, '../../public/reset.js'),
  'utf8',
);

describe('reset recovery page', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="status">Working…</div>';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns to the app after cleanup succeeds', async () => {
    const page = runReset({
      registrations: Promise.resolve([]),
      cacheKeys: Promise.resolve([]),
    });
    await vi.runAllTimersAsync();

    expect(page.replace).toHaveBeenCalledOnce();
    expect(page.replace).toHaveBeenCalledWith('/today?tab=all');
    expect(page.readCacheKeys).toHaveBeenCalledOnce();
  });

  it('returns to the app when a WebKit cleanup promise never settles', async () => {
    const never = new Promise<ServiceWorkerRegistration[]>(() => {});
    const page = runReset({
      registrations: never,
      cacheKeys: Promise.resolve([]),
    });
    await vi.advanceTimersByTimeAsync(RESET_DEADLINE_MS);

    expect(page.replace).toHaveBeenCalledOnce();
    expect(page.replace).toHaveBeenCalledWith('/today?tab=all');
    expect(page.readCacheKeys).toHaveBeenCalledOnce();
  });

  it('continues when cleanup rejects', async () => {
    const page = runReset({
      registrations: Promise.reject(new Error('worker database unavailable')),
      cacheKeys: Promise.resolve([]),
    });
    await vi.runAllTimersAsync();

    expect(page.replace).toHaveBeenCalledOnce();
  });
});

// --- Helpers ---

type ResetOptions = {
  registrations: Promise<ServiceWorkerRegistration[]>;
  cacheKeys: Promise<string[]>;
};

const runReset = (options: ResetOptions) => {
  const replace = vi.fn();
  const readCacheKeys = vi.fn(() => options.cacheKeys);
  const fakeWindow = {
    location: {
      origin: 'https://budgard.com',
      search: `?from=${encodeURIComponent('/today?tab=all')}`,
      replace,
    },
    setTimeout: (callback: () => void, ms: number) =>
      window.setTimeout(callback, ms),
    caches: {
      keys: readCacheKeys,
      delete: vi.fn(() => Promise.resolve(true)),
    },
  };
  const fakeNavigator = {
    serviceWorker: {
      getRegistrations: () => options.registrations,
    },
  };

  new Function('window', 'document', 'navigator', 'caches', resetScript)(
    fakeWindow,
    document,
    fakeNavigator,
    fakeWindow.caches,
  );

  return { replace, readCacheKeys };
};
