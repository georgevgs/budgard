import { useEffect, useRef } from 'react';

// Short lists should never lose their navigation, so nothing hides until the
// user is meaningfully into the page.
const HIDE_THRESHOLD_PX = 80;

// Ignores sub-pixel jitter and iOS rubber-banding at the extremes.
const DIRECTION_DELTA_PX = 6;

// At the end of a list there is nothing left to read, so the dock comes back
// to occupy the space the layout already reserved for it. Without this the
// bottom inset reads as an empty gap once the bar has slid away.
const BOTTOM_REVEAL_PX = 32;

const HIDDEN_ATTRIBUTE = 'data-nav-hidden';

/**
 * Slides the bottom dock away while the user scrolls down, and brings it
 * straight back on any upward scroll.
 *
 * The flag lives on <body> rather than in React state because the nav capsule
 * and the route-owned action buttons sit in different component trees — one
 * attribute lets a single CSS rule move both as one object.
 */
export const useNavAutoHide = (pathname: string): void => {
  // Shared with the route-change effect below, so a tab switch can reset the
  // baseline instead of leaving it at wherever the previous tab's scroll left
  // off — see the effect's comment for why that matters.
  const lastYRef = useRef(window.scrollY);

  useEffect(() => {
    let isTicking = false;

    const applyScrollState = () => {
      isTicking = false;
      const currentY = window.scrollY;

      // At either end of the page the dock is always available, whatever the
      // direction of travel.
      if (currentY <= HIDE_THRESHOLD_PX || isAtBottomOfPage(currentY)) {
        lastYRef.current = currentY;
        setHidden(false);

        return;
      }

      const delta = currentY - lastYRef.current;

      if (Math.abs(delta) < DIRECTION_DELTA_PX) return;

      lastYRef.current = currentY;
      setHidden(delta > 0);
    };

    const handleScroll = () => {
      if (isTicking) return;

      isTicking = true;
      requestAnimationFrame(applyScrollState);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.body.removeAttribute(HIDDEN_ATTRIBUTE);
    };
  }, []);

  // Every route change starts at the top, so the dock comes back with it —
  // except the main tabs, which stay mounted and jump straight to their own
  // remembered scroll position (useRouteScrollRestoration) rather than 0.
  // Resetting the baseline to wherever that jump landed, not just clearing
  // the attribute, stops the next scroll event from comparing the new tab's
  // position against the old tab's and hiding the dock off a jump the user
  // never made.
  useEffect(() => {
    lastYRef.current = window.scrollY;
    document.body.removeAttribute(HIDDEN_ATTRIBUTE);
  }, [pathname]);
};

// --- Helpers ---

// Scroll fires many times a second at both ends of a page, so only touch the
// DOM when the state actually flips — an attribute write invalidates the
// :has() rules that drive the dock.
const setHidden = (next: boolean): void => {
  if (next === document.body.hasAttribute(HIDDEN_ATTRIBUTE)) return;

  if (next) {
    document.body.setAttribute(HIDDEN_ATTRIBUTE, 'true');

    return;
  }

  document.body.removeAttribute(HIDDEN_ATTRIBUTE);
};

const isAtBottomOfPage = (currentY: number): boolean => {
  const pageHeight = document.documentElement.scrollHeight;

  return currentY + window.innerHeight >= pageHeight - BOTTOM_REVEAL_PX;
};
