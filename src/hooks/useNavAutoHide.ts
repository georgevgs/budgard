import { useEffect } from 'react';

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
  useEffect(() => {
    let lastY = window.scrollY;
    let isTicking = false;

    const applyScrollState = () => {
      isTicking = false;
      const currentY = window.scrollY;

      // At either end of the page the dock is always available, whatever the
      // direction of travel.
      if (currentY <= HIDE_THRESHOLD_PX || isAtBottomOfPage(currentY)) {
        lastY = currentY;
        document.body.removeAttribute(HIDDEN_ATTRIBUTE);

        return;
      }

      const delta = currentY - lastY;

      if (Math.abs(delta) < DIRECTION_DELTA_PX) return;

      lastY = currentY;

      if (delta > 0) {
        document.body.setAttribute(HIDDEN_ATTRIBUTE, 'true');

        return;
      }

      document.body.removeAttribute(HIDDEN_ATTRIBUTE);
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

  // Every route change starts at the top, so the dock comes back with it.
  useEffect(() => {
    document.body.removeAttribute(HIDDEN_ATTRIBUTE);
  }, [pathname]);
};

// --- Helpers ---

const isAtBottomOfPage = (currentY: number): boolean => {
  const pageHeight = document.documentElement.scrollHeight;

  return currentY + window.innerHeight >= pageHeight - BOTTOM_REVEAL_PX;
};
