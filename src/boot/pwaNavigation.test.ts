import { describe, expect, it } from 'vitest';
import { PWA_NAVIGATION_DENYLIST } from '@/boot/pwaNavigation';

describe('PWA navigation denylist', () => {
  it('keeps both reset URLs out of the app-shell fallback', () => {
    expect(isDenied('/reset')).toBe(true);
    expect(isDenied('/reset?from=%2Factivity')).toBe(true);
    expect(isDenied('/reset.html?from=%2Factivity')).toBe(true);
  });

  it('still lets application routes use the app shell', () => {
    expect(isDenied('/today')).toBe(false);
    expect(isDenied('/activity?tab=all')).toBe(false);
    expect(isDenied('/resetting')).toBe(false);
  });
});

// Workbox tests each regular expression against pathname + search.
const isDenied = (pathnameAndSearch: string): boolean => {
  for (const pattern of PWA_NAVIGATION_DENYLIST) {
    if (pattern.test(pathnameAndSearch)) {
      return true;
    }
  }

  return false;
};
