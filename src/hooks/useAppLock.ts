import { useCallback, useEffect, useState } from 'react';
import { isLockEnabled } from '@/lib/appLock';

// How long the app can sit in the background before it asks again. Short
// enough that handing someone your phone re-locks it; long enough that
// switching to the banking app to check a figure does not.
const AUTO_LOCK_MS = 60_000;

export type AppLockState = {
  isLocked: boolean;
  // True while the app is backgrounded, so amounts can be masked before the OS
  // takes its app-switcher screenshot.
  isObscured: boolean;
  unlock: () => void;
  lockNow: () => void;
};

/**
 * Locks the app's UI when it has been away long enough, and masks it whenever
 * it is not on screen.
 *
 * The mask matters as much as the lock: iOS photographs the app for the
 * multitasking switcher at the moment it is backgrounded, and that screenshot
 * is visible to anyone who double-taps home — before any lock screen would
 * have had a chance to appear.
 */
export const useAppLock = (isSignedIn: boolean): AppLockState => {
  // Locked from the first frame if a lock is set, so the app is never briefly
  // readable on a cold start while React works out whether it should be.
  const [isLocked, setIsLocked] = useState(() => isSignedIn && isLockEnabled());
  const [isObscured, setIsObscured] = useState(false);

  // Signing out clears the lock; signing in re-applies it.
  const [wasSignedIn, setWasSignedIn] = useState(isSignedIn);
  if (wasSignedIn !== isSignedIn) {
    setWasSignedIn(isSignedIn);
    setIsLocked(isSignedIn && isLockEnabled());
  }

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    let hiddenAt: number | null = null;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        setIsObscured(true);

        return;
      }

      setIsObscured(false);
      if (hiddenAt === null || !isLockEnabled()) {
        return;
      }
      if (Date.now() - hiddenAt >= AUTO_LOCK_MS) {
        setIsLocked(true);
      }
      hiddenAt = null;
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isSignedIn]);

  return {
    isLocked,
    isObscured,
    unlock: useCallback(() => setIsLocked(false), []),
    lockNow: useCallback(() => setIsLocked(true), []),
  };
};

export { AUTO_LOCK_MS };
