import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const LEGACY_PRIVATE_CACHE_NAME = 'supabase-cache';

const read = (file: string): string => {

  return readFileSync(path.join(ROOT, file), 'utf8');
};

describe('PWA private cache policy', () => {
  it('keeps every Supabase request network-only', () => {
    const source = read('vite.config.ts');
    const routeStart = source.indexOf('urlPattern: /^https:');
    const routeEnd = source.indexOf('// Chunks deliberately', routeStart);
    const route = source.slice(routeStart, routeEnd);

    expect(routeStart).toBeGreaterThan(-1);
    expect(routeEnd).toBeGreaterThan(routeStart);
    expect(route).toContain('supabase');
    expect(route).toContain('handler: "NetworkOnly"');
    expect(route).not.toContain('cacheName');
    expect(source).not.toContain('handler: "NetworkFirst"');
  });

  it('deletes the legacy private API cache when a worker activates', async () => {
    const listeners = new Map<string, WorkerListener[]>();
    const deleteCache = vi.fn(() => Promise.resolve(true));
    let activationTask: Promise<unknown> | null = null;
    const workerScope = buildWorkerScope(listeners);

    runInNewContext(read('public/push-sw.js'), {
      caches: { delete: deleteCache },
      self: workerScope,
    });

    const activate = listeners.get('activate')?.[0];
    expect(activate).toBeDefined();

    activate?.({
      waitUntil: (task: Promise<unknown>) => {
        activationTask = task;
      },
    });
    await activationTask;

    expect(deleteCache).toHaveBeenCalledWith(LEGACY_PRIVATE_CACHE_NAME);
    expect(workerScope.clients.claim).not.toHaveBeenCalled();
  });
});

// --- Helpers ---

type WorkerListener = (event: unknown) => void;

const buildWorkerScope = (listeners: Map<string, WorkerListener[]>) => ({
  addEventListener: (type: string, listener: WorkerListener) => {
    const registered = listeners.get(type) ?? [];
    registered.push(listener);
    listeners.set(type, registered);
  },
  clients: {
    claim: vi.fn(() => Promise.resolve()),
    matchAll: vi.fn(() => Promise.resolve([])),
    openWindow: vi.fn(() => Promise.resolve()),
  },
  registration: {
    showNotification: vi.fn(() => Promise.resolve()),
  },
  skipWaiting: vi.fn(() => Promise.resolve()),
});
