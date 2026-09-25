import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');
const ORIGIN = 'https://budgard.com';

type Listener = (event: unknown) => void;

// Runs the real public/push-sw.js against a minimal worker scope and taps a
// notification carrying `url`, returning where the worker tried to go.
const tapNotification = async (url: unknown): Promise<unknown> => {
  const listeners = new Map<string, Listener>();
  const openWindow = vi.fn(() => Promise.resolve());
  const scope = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, listener: Listener) => {
      listeners.set(type, listener);
    },
    clients: {
      claim: vi.fn(() => Promise.resolve()),
      matchAll: vi.fn(() => Promise.resolve([])),
      openWindow,
    },
    registration: { showNotification: vi.fn(() => Promise.resolve()) },
    skipWaiting: vi.fn(),
  };

  runInNewContext(
    readFileSync(path.join(ROOT, 'public/push-sw.js'), 'utf8'),
    { self: scope, caches: { delete: vi.fn() }, URL },
  );

  let task: Promise<unknown> | null = null;
  listeners.get('notificationclick')?.({
    notification: { close: vi.fn(), data: { url } },
    waitUntil: (work: Promise<unknown>) => {
      task = work;
    },
  });
  await task;

  return openWindow.mock.calls[0]?.[0 as never];
};

describe('push notification taps', () => {
  it.each([
    ['/recurring', '/recurring'],
    ['/expenses?action=add', '/expenses?action=add'],
    [`${ORIGIN}/debts`, '/debts'],
  ])('opens the in-app destination %s', async (url, expected) => {
    await expect(tapNotification(url)).resolves.toBe(expected);
  });

  it.each([
    'https://attacker.example/phish',
    '//attacker.example/phish',
    'javascript:alert(1)',
    'https://budgard.com.attacker.example/',
    undefined,
    42,
  ])('falls back to the app root for %s', async (url) => {
    await expect(tapNotification(url)).resolves.toBe('/');
  });
});
