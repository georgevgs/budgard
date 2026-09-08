import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockIsLockEnabled = vi.hoisted(() => vi.fn());
vi.mock('@/constants/appLock', () => ({ isLockEnabled: mockIsLockEnabled }));

import { useAppLock } from '@/common/hooks/useAppLock';

const AUTO_LOCK_MS = 60_000;

let visibility: DocumentVisibilityState = 'visible';
Object.defineProperty(document, 'visibilityState', {
  configurable: true,
  get: () => visibility,
});

const goTo = (next: DocumentVisibilityState): void => {
  visibility = next;
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
};

// Every auto-lock test starts from an unlocked app, because a lock that is
// already on proves nothing about the timer that would have set it.
const renderUnlocked = () => {
  const rendered = renderHook(() => useAppLock(true));
  act(() => rendered.result.current.unlock());

  return rendered;
};

beforeEach(() => {
  visibility = 'visible';
  mockIsLockEnabled.mockReturnValue(true);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useAppLock', () => {
  it('locks on the first frame when a signed-in user has a lock set', () => {
    const { result } = renderHook(() => useAppLock(true));

    expect(result.current.isLocked).toBe(true);
  });

  it('does not lock when no lock is set', () => {
    mockIsLockEnabled.mockReturnValue(false);

    const { result } = renderHook(() => useAppLock(true));

    expect(result.current.isLocked).toBe(false);
  });

  it('does not lock a signed-out visitor', () => {
    const { result } = renderHook(() => useAppLock(false));

    expect(result.current.isLocked).toBe(false);
  });

  it('drops the lock on sign-out and re-applies it on sign-in', () => {
    const { result, rerender } = renderHook(
      ({ isSignedIn }) => useAppLock(isSignedIn),
      { initialProps: { isSignedIn: true } },
    );

    rerender({ isSignedIn: false });
    expect(result.current.isLocked).toBe(false);

    rerender({ isSignedIn: true });
    expect(result.current.isLocked).toBe(true);
  });

  it('masks the app while it is off screen', () => {
    const { result } = renderUnlocked();

    goTo('hidden');
    expect(result.current.isObscured).toBe(true);

    goTo('visible');
    expect(result.current.isObscured).toBe(false);
  });

  it('stays unlocked when the app was away for less than the grace period', () => {
    const { result } = renderUnlocked();

    goTo('hidden');
    vi.advanceTimersByTime(AUTO_LOCK_MS - 1);
    goTo('visible');

    expect(result.current.isLocked).toBe(false);
  });

  it('locks when the app was away for the whole grace period', () => {
    const { result } = renderUnlocked();

    goTo('hidden');
    vi.advanceTimersByTime(AUTO_LOCK_MS);
    goTo('visible');

    expect(result.current.isLocked).toBe(true);
  });

  it('does not lock on return when the lock was removed while away', () => {
    const { result } = renderUnlocked();

    goTo('hidden');
    mockIsLockEnabled.mockReturnValue(false);
    vi.advanceTimersByTime(AUTO_LOCK_MS);
    goTo('visible');

    expect(result.current.isLocked).toBe(false);
  });

  it('does not lock on a visibility event that follows no absence', () => {
    const { result } = renderUnlocked();

    vi.advanceTimersByTime(AUTO_LOCK_MS);
    goTo('visible');

    expect(result.current.isLocked).toBe(false);
  });

  it('forgets a completed absence, so a repeated wake does not re-measure it', () => {
    const { result } = renderUnlocked();

    goTo('hidden');
    vi.advanceTimersByTime(1);
    goTo('visible');

    // On screen the whole time, then a second wake for the same return.
    vi.advanceTimersByTime(AUTO_LOCK_MS);
    goTo('visible');

    expect(result.current.isLocked).toBe(false);
  });

  it('locks and unlocks on demand', () => {
    mockIsLockEnabled.mockReturnValue(false);
    const { result } = renderHook(() => useAppLock(true));

    act(() => result.current.lockNow());
    expect(result.current.isLocked).toBe(true);

    act(() => result.current.unlock());
    expect(result.current.isLocked).toBe(false);
  });

  it('watches visibility only while signed in, and stops on unmount', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');

    const signedOut = renderHook(() => useAppLock(false));
    expect(add).not.toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
    signedOut.unmount();

    const signedIn = renderHook(() => useAppLock(true));
    expect(add).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

    signedIn.unmount();
    expect(remove).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
  });
});
