import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePwaUpdate } from '@/common/hooks/usePwaUpdate';

// useRegisterSW owns the needRefresh flag in real life. Standing in for it with
// real state is what lets a test drive the false → true transition the hook
// keys off, and capture the registration callback it installs.
let registeredCallback: ((url: string, reg: unknown) => void) | null = null;
const mockUpdateServiceWorker = vi.fn();
let setNeedRefreshOutside: ((value: boolean) => void) | null = null;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options: {
    onRegisteredSW?: (url: string, reg: unknown) => void;
  }) => {
    const [needRefresh, setNeedRefresh] = useState(false);
    registeredCallback = options.onRegisteredSW ?? null;
    setNeedRefreshOutside = setNeedRefresh;

    return {
      needRefresh: [needRefresh, setNeedRefresh],
      updateServiceWorker: mockUpdateServiceWorker,
    };
  },
}));

const mockToast = vi.fn();
vi.mock('@/common/hooks/useToast', () => ({ toast: mockToast }));

let currentRegistration: { waiting: unknown } | null = null;
vi.mock('@/config/swRegistration', () => ({
  swRegistration: {
    get: () => currentRegistration,
    set: vi.fn(),
  },
}));

const mockIsSameBuild = vi.fn();
vi.mock('@/config/swBuildId', () => ({
  isSameBuildAsPage: (worker: unknown) => mockIsSameBuild(worker),
}));

const offerUpdate = () => {
  act(() => {
    setNeedRefreshOutside?.(true);
  });
};

const titles = () => mockToast.mock.calls.map((call) => call[0].title);

describe('usePwaUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    currentRegistration = { waiting: { id: 'waiting-worker' } };
    mockIsSameBuild.mockResolvedValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('offers the update when the waiting worker is a different build', async () => {
    renderHook(() => usePwaUpdate());
    offerUpdate();

    await waitFor(() => {
      expect(titles()).toContain('pwa.updateAvailableTitle');
    });
  });

  // iOS can re-install the SAME bytes after killing the PWA process, parking an
  // identical worker in the waiting slot. Offering that as an update is the
  // false prompt the build-id handshake exists to kill.
  it('stays silent when the waiting worker is this same build', async () => {
    mockIsSameBuild.mockResolvedValue(true);
    renderHook(() => usePwaUpdate());
    offerUpdate();

    await act(async () => {
      await Promise.resolve();
    });

    expect(titles()).not.toContain('pwa.updateAvailableTitle');
  });

  // The loop this guards: a reload to apply an update lands back on the old
  // version, which re-detects the same waiting worker. Reloading again just
  // loops, so the breaker trips and points at a full close instead.
  it('shows the stuck toast instead of re-offering after a recent apply', async () => {
    sessionStorage.setItem('pwa-update-reloaded-at', String(Date.now()));
    renderHook(() => usePwaUpdate());
    offerUpdate();

    await waitFor(() => {
      expect(titles()).toContain('pwa.stuckTitle');
    });
    expect(titles()).not.toContain('pwa.updateAvailableTitle');
  });

  // The stamp self-expires so a genuinely new deploy minutes later is not
  // mistaken for a loop.
  it('treats an old apply stamp as unrelated and offers normally', async () => {
    sessionStorage.setItem(
      'pwa-update-reloaded-at',
      String(Date.now() - 120000),
    );
    renderHook(() => usePwaUpdate());
    offerUpdate();

    await waitFor(() => {
      expect(titles()).toContain('pwa.updateAvailableTitle');
    });
  });

  it('clears the flag when no waiting worker ever materialises', async () => {
    vi.useFakeTimers();
    currentRegistration = { waiting: null };
    const { result } = renderHook(() => usePwaUpdate());
    offerUpdate();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(titles()).not.toContain('pwa.updateAvailableTitle');
    expect(result.current).toBeUndefined();
  });

  // visibilitychange does not fire on a fresh iOS PWA open (the page starts
  // visible) and the hourly interval has not come round yet, so registration is
  // the only thing that can trigger the first check.
  it('checks for an update as soon as the worker registers', () => {
    renderHook(() => usePwaUpdate());
    const update = vi.fn().mockResolvedValue(undefined);

    act(() => {
      registeredCallback?.('/sw.js', {
        update,
        installing: null,
      });
    });

    expect(update).toHaveBeenCalledTimes(1);
  });
});
