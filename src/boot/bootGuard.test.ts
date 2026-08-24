import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildBootGuardScript } from './bootGuard';

const BACKSTOP_MS = 20000;
const BREAKER_KEY = 'budgard-boot-recovered';

describe('boot guard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="root"></div>';
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends a never-mounting app to reset.html, preserving where it was', () => {
    const guard = runGuard({ path: '/activity?tab=all' });
    vi.advanceTimersByTime(BACKSTOP_MS);

    expect(guard.replace).toHaveBeenCalledWith(
      `/reset.html?from=${encodeURIComponent('/activity?tab=all')}`,
    );
  });

  it('leaves a mounted app alone', () => {
    const guard = runGuard();
    mount();
    vi.advanceTimersByTime(BACKSTOP_MS);

    expect(guard.replace).not.toHaveBeenCalled();
  });

  it('recovers immediately when an /assets/ script fails', () => {
    const guard = runGuard();
    guard.failScript('/assets/index-abc123.js');

    expect(guard.replace).toHaveBeenCalledOnce();
  });

  it('ignores a third-party script failure', () => {
    const guard = runGuard();
    guard.failScript('https://static.cloudflareinsights.com/beacon.js');

    expect(guard.replace).not.toHaveBeenCalled();
  });

  it('ignores a lazy chunk failing after mount — main.tsx owns that', () => {
    const guard = runGuard();
    mount();
    guard.failScript('/assets/AnalyticsView-abc123.js');

    expect(guard.replace).not.toHaveBeenCalled();
  });

  it('recovers only once per session, so a broken build cannot loop', () => {
    const first = runGuard();
    vi.advanceTimersByTime(BACKSTOP_MS);
    expect(first.replace).toHaveBeenCalledOnce();

    const second = runGuard();
    vi.advanceTimersByTime(BACKSTOP_MS);
    expect(second.replace).not.toHaveBeenCalled();
  });

  it('clears the breaker once the app boots, so a later break can recover', () => {
    sessionStorage.setItem(BREAKER_KEY, '1');

    runGuard();
    mount();
    vi.advanceTimersByTime(BACKSTOP_MS);

    expect(sessionStorage.getItem(BREAKER_KEY)).toBeNull();
  });

  it('stays put when offline — a stalled boot is expected there', () => {
    const guard = runGuard({ online: false });
    vi.advanceTimersByTime(BACKSTOP_MS);

    expect(guard.replace).not.toHaveBeenCalled();
  });

  it('escapes when an older worker serves the app shell at /reset', () => {
    const guard = runGuard({ path: '/reset?from=%2Factivity' });
    vi.advanceTimersByTime(BACKSTOP_MS);

    expect(guard.replace).toHaveBeenCalledWith(
      `/reset.html?from=${encodeURIComponent('/')}`,
    );
  });

  it('does not guard the physical reset page', () => {
    const guard = runGuard({ path: '/reset.html' });
    vi.advanceTimersByTime(BACKSTOP_MS);

    expect(guard.replace).not.toHaveBeenCalled();
  });
});

// --- Helpers ---

const mount = (): void => {
  document.getElementById('root')!.appendChild(document.createElement('span'));
};

type GuardRun = {
  replace: ReturnType<typeof vi.fn>;
  failScript: (src: string) => void;
};

// Runs the exact string that gets inlined into <head>. The globals it touches
// arrive as parameters, which shadow the real ones inside the function body —
// jsdom makes window.location.replace unforgeable, so it cannot be spied on.
const runGuard = (options: { path?: string; online?: boolean } = {}): GuardRun => {
  const url = new URL(options.path ?? '/activity', 'https://budgard.com');
  const replace = vi.fn();
  let onError: ((event: unknown) => void) | null = null;

  const fakeWindow = {
    location: { pathname: url.pathname, search: url.search, replace },
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      if (type === 'error') {
        onError = handler;
      }
    },
    setTimeout: (callback: () => void, ms: number) => setTimeout(callback, ms),
  };

  const fakeNavigator = { onLine: options.online ?? true };

  new Function(
    'window',
    'document',
    'sessionStorage',
    'navigator',
    buildBootGuardScript(),
  )(fakeWindow, document, sessionStorage, fakeNavigator);

  return {
    replace,
    failScript: (src: string) => {
      onError?.({ target: { tagName: 'SCRIPT', src } });
    },
  };
};
