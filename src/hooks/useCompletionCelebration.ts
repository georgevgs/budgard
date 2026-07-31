import { useEffect, useRef } from 'react';

// Fires `onComplete(id)` once for each id that newly enters the completed set,
// but only while `enabled` is true. Whatever is already complete when tracking
// first arms is remembered silently (no replay on load / cache hydration), and
// each id celebrates at most once even if it later drops out and returns (e.g.
// an oscillating net-delta goal).
export const useCompletionCelebration = (
  completedIds: string[],
  enabled: boolean,
  onComplete: (id: string) => void,
): void => {
  const celebratedRef = useRef<Set<string> | null>(null);
  const callbackRef = useRef(onComplete);

  // Mirrored after every commit (writing during render is illegal); effects
  // run in declaration order, so the celebration effect below always reads
  // the latest callback.
  useEffect(() => {
    callbackRef.current = onComplete;
  });

  // Derive a primitive key so the effect only runs when the set changes.
  const key = completedIds.join('|');

  useEffect(() => {
    if (!enabled) return;

    // First armed run seeds the baseline without celebrating.
    if (celebratedRef.current === null) {
      celebratedRef.current = new Set(completedIds);

      return;
    }

    for (const id of completedIds) {
      if (!celebratedRef.current.has(id)) {
        celebratedRef.current.add(id);
        callbackRef.current(id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
};
