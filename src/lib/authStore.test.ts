import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to control the Supabase mock before authStore initializes.
// The module reads localStorage + sets up onAuthStateChange at import time.

let authChangeCallback: ((event: string, session: unknown) => void) | null =
  null;
const mockRefreshSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(
        (cb: (event: string, session: unknown) => void) => {
          authChangeCallback = cb;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        },
      ),
      refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
    },
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports subscribe and getSnapshot', async () => {
    const { authStore } = await import('./authStore');
    expect(typeof authStore.subscribe).toBe('function');
    expect(typeof authStore.getSnapshot).toBe('function');
    expect(typeof authStore.getServerSnapshot).toBe('function');
  });

  it('getServerSnapshot returns null session with loading true', async () => {
    const { authStore } = await import('./authStore');
    const snapshot = authStore.getServerSnapshot();
    expect(snapshot.session).toBeNull();
    expect(snapshot.isLoading).toBe(true);
  });

  it('subscribe returns an unsubscribe function', async () => {
    const { authStore } = await import('./authStore');
    const listener = vi.fn();
    const unsubscribe = authStore.subscribe(listener);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('notifies listeners when session changes via auth state change', async () => {
    const { authStore } = await import('./authStore');
    const listener = vi.fn();
    authStore.subscribe(listener);

    const session = {
      user: { id: 'u1' },
      access_token: 'tok',
      refresh_token: 'ref',
    };
    authChangeCallback?.('SIGNED_IN', session);

    expect(listener).toHaveBeenCalled();
    expect(authStore.getSnapshot().session).toBeTruthy();
  });

  it('attempts recovery on spurious SIGNED_OUT (iOS PWA)', async () => {
    // First sign in to establish a last known session
    const session = {
      user: { id: 'u1' },
      access_token: 'tok',
      refresh_token: 'ref-token',
    };
    authChangeCallback?.('SIGNED_IN', session);

    // Now simulate spurious SIGNED_OUT
    authChangeCallback?.('SIGNED_OUT', null);

    // Should NOT immediately sign out — starts recovery timer
    const { authStore } = await import('./authStore');
    // Snapshot should still have the previous session (held during recovery)
    const snap = authStore.getSnapshot();
    expect(snap.session).toBeTruthy();

    // Simulate successful recovery
    const newSession = {
      user: { id: 'u1' },
      access_token: 'new-tok',
      refresh_token: 'new-ref',
    };
    mockRefreshSession.mockResolvedValue({
      data: { session: newSession },
      error: null,
    });

    // Advance past 2s recovery timer
    await vi.advanceTimersByTimeAsync(2000);

    expect(mockRefreshSession).toHaveBeenCalledWith({
      refresh_token: 'ref-token',
    });
  });

  it('signs out after failed recovery', async () => {
    const session = {
      user: { id: 'u1' },
      access_token: 'tok',
      refresh_token: 'ref-token',
    };
    authChangeCallback?.('SIGNED_IN', session);

    // Spurious SIGNED_OUT
    authChangeCallback?.('SIGNED_OUT', null);

    mockRefreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'expired' },
    });

    const { authStore } = await import('./authStore');
    await vi.advanceTimersByTimeAsync(2000);

    // After failed recovery, session should be null
    expect(authStore.getSnapshot().session).toBeNull();
  });

  it('markIntentionalSignOut prevents recovery attempt', async () => {
    const { markIntentionalSignOut, authStore } = await import('./authStore');

    const session = {
      user: { id: 'u1' },
      access_token: 'tok',
      refresh_token: 'ref',
    };
    authChangeCallback?.('SIGNED_IN', session);

    // Mark intentional before signing out
    markIntentionalSignOut();
    authChangeCallback?.('SIGNED_OUT', null);

    // Should immediately sign out without recovery attempt
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockRefreshSession).not.toHaveBeenCalled();
    expect(authStore.getSnapshot().session).toBeNull();
  });
});
