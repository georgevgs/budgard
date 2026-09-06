import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Gives each app route its own window scroll position. The main tabs stay
 * mounted to preserve filters and form state, so their scroll position should
 * behave the same way instead of leaking from whichever tab was open before.
 */
export const useRouteScrollRestoration = (): void => {
  const { pathname } = useLocation();
  const positions = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const routePositions = positions.current;
    const savedPosition = routePositions.get(pathname) ?? 0;
    let lastPosition = savedPosition;
    window.scrollTo(0, savedPosition);

    // Capture while the route is visible. Reading scrollY during cleanup can
    // force layout after its tab has been hidden and save a clamped position.
    const rememberScroll = () => {
      lastPosition = Math.max(0, window.scrollY);
    };
    window.addEventListener('scroll', rememberScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', rememberScroll);
      routePositions.set(pathname, lastPosition);
    };
  }, [pathname]);
};
