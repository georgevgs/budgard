import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Subscription } from '@/types/Subscription';

const auth = vi.hoisted(() => ({
  session: { user: { id: 'u1' } } as { user: { id: string } } | null,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

const svc = vi.hoisted(() => ({ getSubscription: vi.fn() }));
vi.mock('@/services/subscriptionService', () => ({
  subscriptionService: svc,
}));

const cache = vi.hoisted(() => ({
  loadSubscriptionSnapshot: vi.fn<(userId: string) => unknown>(() => null),
  saveSubscriptionSnapshot: vi.fn(),
  clearSubscriptionSnapshot: vi.fn(),
}));
vi.mock('@/lib/subscriptionCache', () => cache);

import { useSubscriptionState } from '@/hooks/pro/useSubscriptionState';

const PRO = { id: 's1', status: 'active' } as unknown as Subscription;
const OTHER_PRO = { id: 's2', status: 'active' } as unknown as Subscription;

beforeEach(() => {
  vi.clearAllMocks();
  auth.session = { user: { id: 'u1' } };
  cache.loadSubscriptionSnapshot.mockReturnValue(null);
  svc.getSubscription.mockResolvedValue(PRO);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSubscriptionState', () => {
  it('is Pro on the first paint when a snapshot exists', async () => {
    // A returning Pro user must not flash paywalls while the fetch resolves.
    cache.loadSubscriptionSnapshot.mockReturnValue(PRO);

    const { result } = renderHook(() => useSubscriptionState());

    expect(result.current.subscription).toEqual(PRO);
    expect(result.current.isLoading).toBe(false);
    await waitFor(() => expect(svc.getSubscription).toHaveBeenCalled());
  });

  it('loads from the network when there is no snapshot', async () => {
    const { result } = renderHook(() => useSubscriptionState());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.subscription).toEqual(PRO);
    expect(cache.saveSubscriptionSnapshot).toHaveBeenCalledWith('u1', PRO);
  });

  it('never revokes access because a fetch failed', async () => {
    // A network blip must not downgrade a paying user mid-session.
    cache.loadSubscriptionSnapshot.mockReturnValue(PRO);
    svc.getSubscription.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useSubscriptionState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.subscription).toEqual(PRO);
  });

  it('treats a missing row as free tier', async () => {
    svc.getSubscription.mockResolvedValue(null);

    const { result } = renderHook(() => useSubscriptionState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.subscription).toBeNull();
  });

  it('drops the previous user Pro state the moment they sign out', async () => {
    cache.loadSubscriptionSnapshot.mockReturnValue(PRO);
    const { result, rerender } = renderHook(() => useSubscriptionState());
    await waitFor(() => expect(result.current.subscription).toEqual(PRO));

    auth.session = null;
    rerender();

    expect(result.current.subscription).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('clears the stored snapshot on sign-out, for shared devices', async () => {
    const { rerender } = renderHook(() => useSubscriptionState());
    await waitFor(() => expect(svc.getSubscription).toHaveBeenCalled());

    auth.session = null;
    rerender();

    await waitFor(() =>
      expect(cache.clearSubscriptionSnapshot).toHaveBeenCalled(),
    );
  });

  it('does not show one user the previous user subscription', async () => {
    cache.loadSubscriptionSnapshot.mockReturnValue(PRO);
    const { result, rerender } = renderHook(() => useSubscriptionState());
    await waitFor(() => expect(result.current.subscription).toEqual(PRO));

    cache.loadSubscriptionSnapshot.mockReturnValue(OTHER_PRO);
    auth.session = { user: { id: 'u2' } };
    rerender();

    expect(result.current.subscription).toEqual(OTHER_PRO);
  });

  it('clears the previous user Pro state when the next user has no cache', async () => {
    cache.loadSubscriptionSnapshot.mockImplementation((userId) => {
      if (userId === 'u1') {
        return PRO;
      }

      return null;
    });
    const { result, rerender } = renderHook(() => useSubscriptionState());
    await waitFor(() => expect(result.current.subscription).toEqual(PRO));

    svc.getSubscription.mockImplementation(() => new Promise(() => {}));
    auth.session = { user: { id: 'u2' } };
    rerender();

    expect(result.current.subscription).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('refresh is a no-op without a session', async () => {
    auth.session = null;
    const { result } = renderHook(() => useSubscriptionState());

    await act(async () => {
      await result.current.refresh();
    });

    expect(svc.getSubscription).not.toHaveBeenCalled();
    expect(cache.clearSubscriptionSnapshot).toHaveBeenCalled();
  });
});

describe('refetch on returning from checkout', () => {
  it('re-checks when the tab is refocused after the fresh window', async () => {
    // Coming back from the Stripe tab, the webhook has usually landed.
    const { result } = renderHook(() => useSubscriptionState());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    svc.getSubscription.mockClear();

    // Push the last-fetch timestamp beyond the 30s freshness window.
    const realNow = Date.now;
    Date.now = () => realNow() + 60_000;
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    Date.now = realNow;

    await waitFor(() => expect(svc.getSubscription).toHaveBeenCalled());
  });

  it('ignores a quick alt-tab so refocus cannot cause a refetch storm', async () => {
    const { result } = renderHook(() => useSubscriptionState());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    svc.getSubscription.mockClear();

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(svc.getSubscription).not.toHaveBeenCalled();
  });
});
