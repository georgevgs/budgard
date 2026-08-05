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
    window.scrollTo(0, savedPosition);

    return () => {
      routePositions.set(pathname, window.scrollY);
    };
  }, [pathname]);
};
