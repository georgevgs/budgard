import { lazy, type ComponentType } from 'react';

/**
 * Wraps React.lazy with stale-chunk recovery.
 *
 * After a deploy the service worker may still serve a cached index.html
 * that references old chunk hashes. When the browser requests a chunk that
 * no longer exists, the server returns HTML (Netlify SPA fallback), causing:
 *   TypeError: 'text/html' is not a valid JavaScript MIME type.
 *
 * When this happens, we redirect to /reset which unregisters the service
 * worker, clears all caches, and redirects back to the current page so the
 * browser fetches fresh assets.
 */
const lazyWithRetry = <T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
): ReturnType<typeof lazy<T>> =>
  lazy(async () => {
    try {
      return await importFn();
    } catch (_error) {
      const returnTo = encodeURIComponent(window.location.pathname);
      window.location.replace(`/reset?from=${returnTo}`);

      // Never resolves — the page is navigating away
      return new Promise(() => {});
    }
  });

export { lazyWithRetry };
