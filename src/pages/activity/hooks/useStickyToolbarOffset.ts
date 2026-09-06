import { useCallback, useEffect, useState } from 'react';

// Activity's day-group headers stick just below this toolbar rather than
// behind it, so the current date stays legible while the list scrolls (see
// `.activity-day-header` in index.css). The offset is measured rather than
// guessed: the toolbar's own height moves with the locale (Greek labels wrap
// sooner than English ones) and with whether the month row is showing at
// all, so a hard-coded constant would drift out of sync with either.
export const useStickyToolbarOffset = () => {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);

  // A callback ref, not a plain `useRef`. ActivityView calls this hook
  // before its own `isInitialized` check, so on a cold load — landing
  // straight on Activity rather than tabbing into it — the very first
  // commit is the loading skeleton, with no toolbar in the tree at all. A
  // `useRef` would sit at `null` through that commit, and a `[]`-deps effect
  // reading it would never get a second chance to see the real toolbar once
  // the skeleton was replaced: the day headers would stick at `top: 0`,
  // right under the toolbar instead of below it, for the rest of the
  // session. Reported Sep 5 2026 (looked like the sticky header "moving"
  // while scrolling) and reproduced directly — confirmed the toolbar was
  // genuinely rendered at its real height while this hook still reported 0.
  // Measuring here, the moment the node actually attaches, fixes that
  // regardless of which commit it happens on — and does it earlier than an
  // effect could, which is what avoids the header sitting under the toolbar
  // for that first frame.
  const ref = useCallback((node: HTMLDivElement | null) => {
    setElement(node);
    setHeight(node ? node.getBoundingClientRect().height : 0);
  }, []);

  useEffect(() => {
    if (!element || typeof ResizeObserver !== 'function') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      // Sub-pixel changes fire constantly during a view transition and each
      // one would otherwise re-render the whole screen.
      setHeight((previous) => {
        const next = entry.target.getBoundingClientRect().height;
        if (Math.abs(next - previous) < 1) {
          return previous;
        }

        return next;
      });
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [element]);

  return { ref, height };
};
