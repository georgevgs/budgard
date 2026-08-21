import { useEffect, useRef, useState } from 'react';
import { haptics } from '@/lib/haptics';

type Options = {
  onRefresh: () => Promise<void>;
  // Off on desktop, and off while the app has nothing to refresh into.
  enabled?: boolean;
};

export type PullToRefreshState = {
  // Whether the gesture is wired up at all. A pointer-driven layout has no
  // pull, so the indicator has no reason to be in the DOM there either.
  isEnabled: boolean;
  isRefreshing: boolean;
};

// The pull follows the finger exactly for the first few pixels and then eases
// off towards MAX_PULL_PX, which it approaches but never reaches. Tracking 1:1
// at the start is what makes the gesture feel picked up immediately; the ease
// afterwards is what stops the page feeling like it has come loose.
const MAX_PULL_PX = 132;
const TRIGGER_PX = 64;
// The finger has to commit to a direction within this many pixels before the
// gesture is taken off the page. Without it, a sideways swipe across the
// category chips or the templates bar drags the whole page down with it.
const DIRECTION_LOCK_PX = 8;
// A refetch that answers out of cache can resolve in under a frame. Holding
// the spinner for a beat is the difference between "refreshed" and a flicker
// the user reads as a bug.
const MIN_REFRESH_MS = 550;
// Covers the release ease in index.css. The stage attribute — and with it the
// transform — is only dropped once the page has finished settling back.
const SETTLE_MS = 460;

// Where the finger is in the gesture, as opposed to what the screen is doing.
type Phase = 'idle' | 'deciding' | 'pulling';
// What the screen is doing, as opposed to where the finger is. Written to the
// document element so index.css can style each one.
type Stage = 'idle' | 'pulling' | 'armed' | 'refreshing' | 'settling';

/**
 * Pull down at the top of the page to refetch.
 *
 * Two deliberate departures from the obvious implementation:
 *
 * Native listeners rather than React's synthetic ones, because React registers
 * `touchmove` as passive at the root, and a passive listener cannot call
 * preventDefault — without which iOS scrolls the page out from under the
 * gesture and the pull never gets a chance to start.
 *
 * And the travel is published as two custom properties on the document element
 * rather than as React state. State would re-render the entire authenticated
 * shell — header, dock, and every row of the active tab — once per touchmove,
 * which is a reconciliation pass per frame on the one gesture in the app the
 * user watches most closely. React only hears about the phase changes, of
 * which there are four in a whole pull.
 */
export const usePullToRefresh = ({
  onRefresh,
  enabled = true,
}: Options): PullToRefreshState => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Read inside native listeners that are registered once, so they always see
  // the current callback without being torn down and re-added on every render.
  const refreshRef = useRef(onRefresh);
  const refreshingRef = useRef(false);

  useEffect(() => {
    refreshRef.current = onRefresh;
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const root = document.documentElement;
    // A refetch can outlive the effect — a tab switch flips `enabled` off
    // while it is still in flight — and its `finally` must not write the
    // gesture back onto a document the cleanup has just tidied.
    let disposed = false;
    let phase: Phase = 'idle';
    let stage: Stage = 'idle';
    let armed = false;
    let startY = 0;
    let startX = 0;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;

    const paint = (pulled: number) => {
      const progress = Math.min(pulled / TRIGGER_PX, 1);
      root.style.setProperty('--pull-y', `${pulled.toFixed(1)}px`);
      root.style.setProperty('--pull-progress', progress.toFixed(3));
    };

    const setStage = (next: Stage) => {
      if (stage === next) {
        return;
      }
      stage = next;
      root.dataset.pull = next;
    };

    // Everything the gesture wrote comes back off the document, transform
    // included: a transform creates a containing block for fixed-position
    // descendants, and leaving one in place permanently would change how
    // anything fixed inside a route positions itself.
    const clearStage = () => {
      stage = 'idle';
      delete root.dataset.pull;
      root.style.removeProperty('--pull-y');
      root.style.removeProperty('--pull-progress');
    };

    const settleBack = () => {
      if (disposed) {
        return;
      }
      setStage('settling');
      paint(0);
      clearTimeout(settleTimer);
      settleTimer = setTimeout(clearStage, SETTLE_MS);
    };

    const handleStart = (event: TouchEvent) => {
      if (!canStartPull(event, refreshingRef.current)) {
        phase = 'idle';

        return;
      }
      startY = event.touches[0].clientY;
      startX = event.touches[0].clientX;
      phase = 'deciding';
      armed = false;
    };

    const handleMove = (event: TouchEvent) => {
      if (phase === 'idle') {
        return;
      }

      const deltaY = event.touches[0].clientY - startY;
      const deltaX = event.touches[0].clientX - startX;

      if (phase === 'deciding') {
        const verdict = readDirection(deltaX, deltaY);
        if (verdict === 'undecided') {
          return;
        }
        if (verdict === 'not-a-pull') {
          phase = 'idle';

          return;
        }
        phase = 'pulling';
        clearTimeout(settleTimer);
      }

      if (deltaY <= 0) {
        // The finger went back up past the origin — this is a scroll, not a
        // pull. Hand it back rather than half-holding the gesture.
        phase = 'idle';
        armed = false;
        settleBack();

        return;
      }
      // The page would otherwise scroll under the gesture on iOS.
      if (event.cancelable) {
        event.preventDefault();
      }

      const pulled = resist(deltaY);
      paint(pulled);

      // One tick the moment it would fire, so the pull can be released by
      // feel without watching the indicator.
      if (pulled >= TRIGGER_PX && !armed) {
        armed = true;
        haptics.selection();
      }
      if (pulled < TRIGGER_PX) {
        armed = false;
      }
      setStage(armToStage(armed));
    };

    const finish = () => {
      refreshingRef.current = false;
      setIsRefreshing(false);
      settleBack();
    };

    const handleEnd = () => {
      if (phase !== 'pulling') {
        phase = 'idle';

        return;
      }
      phase = 'idle';

      if (!armed) {
        settleBack();

        return;
      }

      armed = false;
      refreshingRef.current = true;
      setIsRefreshing(true);
      setStage('refreshing');
      // Hold at exactly the point the gesture armed, so releasing moves the
      // page up to meet a puck that has already landed rather than dragging
      // the puck around with it.
      paint(TRIGGER_PX);

      const startedAt = performance.now();
      void refreshRef
        .current()
        .catch(() => {
          // The data layer raises its own retry toast; the indicator's only
          // job is to stop.
        })
        .finally(() => {
          const remaining = MIN_REFRESH_MS - (performance.now() - startedAt);
          if (remaining <= 0) {
            finish();

            return;
          }
          holdTimer = setTimeout(finish, remaining);
        });
    };

    document.addEventListener('touchstart', handleStart, { passive: true });
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd, { passive: true });
    document.addEventListener('touchcancel', handleEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleStart);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
      disposed = true;
      clearTimeout(settleTimer);
      clearTimeout(holdTimer);
      clearStage();
    };
  }, [enabled]);

  return { isEnabled: enabled, isRefreshing };
};

// --- Helpers ---

// Slope 1 at the origin, asymptotic to MAX_PULL_PX. The hyperbolic curve this
// replaced resisted from the very first pixel, so a 140px drag yielded 40px of
// travel and the gesture could not physically reach its own trigger.
const resist = (delta: number): number => {
  return MAX_PULL_PX * (1 - Math.exp(-delta / MAX_PULL_PX));
};

// Nothing is taken from the page until the finger has said which way it is
// going, and it only counts as a pull if it is going down more than sideways.
const readDirection = (
  deltaX: number,
  deltaY: number,
): 'undecided' | 'pull' | 'not-a-pull' => {
  if (
    Math.abs(deltaY) < DIRECTION_LOCK_PX &&
    Math.abs(deltaX) < DIRECTION_LOCK_PX
  ) {
    return 'undecided';
  }
  if (deltaY <= 0 || Math.abs(deltaX) > deltaY) {
    return 'not-a-pull';
  }

  return 'pull';
};

const armToStage = (armed: boolean): Stage => {
  if (armed) {
    return 'armed';
  }

  return 'pulling';
};

const canStartPull = (event: TouchEvent, isRefreshing: boolean): boolean => {
  if (isRefreshing) {
    return false;
  }
  // A second finger means a pinch, not a pull.
  if (event.touches.length !== 1) {
    return false;
  }
  // A dialog or sheet owns the screen and has locked the body; the page
  // underneath is not what the finger is on.
  if (document.body.hasAttribute('data-scroll-locked')) {
    return false;
  }
  // Only from a genuine resting position at the top. Starting mid-scroll
  // would hijack a flick back to the top of a long list.
  if (window.scrollY > 0) {
    return false;
  }

  return !hasScrolledAncestor(event.target);
};

// The page can be at the top while something under the finger — a scrollable
// panel inside a route — is not. That panel's scroll is its own to give back.
const hasScrolledAncestor = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) {
    return false;
  }

  let node: Element | null = target;
  while (node && node !== document.body) {
    if (node.scrollTop > 0) {
      return true;
    }
    node = node.parentElement;
  }

  return false;
};
