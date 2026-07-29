import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavAutoHide } from '@/hooks/useNavAutoHide';

const isHidden = () => document.body.hasAttribute('data-nav-hidden');

const scrollTo = (y: number) => {
  act(() => {
    window.scrollY = y;
    window.dispatchEvent(new Event('scroll'));
  });
};

const VIEWPORT_HEIGHT = 800;
const PAGE_HEIGHT = 5000;
const BOTTOM_Y = PAGE_HEIGHT - VIEWPORT_HEIGHT;

describe('useNavAutoHide', () => {
  beforeEach(() => {
    window.scrollY = 0;
    window.innerHeight = VIEWPORT_HEIGHT;
    // jsdom reports scrollHeight 0, which would read as "always at the bottom".
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: PAGE_HEIGHT,
    });
    document.body.removeAttribute('data-nav-hidden');
    // Run the rAF callback synchronously so scroll state settles in-test.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);

      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts visible', () => {
    renderHook(() => useNavAutoHide('/expenses'));
    expect(isHidden()).toBe(false);
  });

  it('hides once the user scrolls down past the threshold', () => {
    renderHook(() => useNavAutoHide('/expenses'));

    scrollTo(400);
    expect(isHidden()).toBe(true);
  });

  it('stays visible while still near the top of the page', () => {
    renderHook(() => useNavAutoHide('/expenses'));

    scrollTo(60);
    expect(isHidden()).toBe(false);
  });

  it('comes back on any upward scroll', () => {
    renderHook(() => useNavAutoHide('/expenses'));

    scrollTo(400);
    expect(isHidden()).toBe(true);

    scrollTo(360);
    expect(isHidden()).toBe(false);
  });

  it('ignores jitter too small to be a direction change', () => {
    renderHook(() => useNavAutoHide('/expenses'));

    scrollTo(400);
    scrollTo(397);
    expect(isHidden()).toBe(true);
  });

  it('returns on scrolling back to the top', () => {
    renderHook(() => useNavAutoHide('/expenses'));

    scrollTo(400);
    scrollTo(0);
    expect(isHidden()).toBe(false);
  });

  it('comes back when the route changes', () => {
    const { rerender } = renderHook(({ path }) => useNavAutoHide(path), {
      initialProps: { path: '/expenses' },
    });

    scrollTo(400);
    expect(isHidden()).toBe(true);

    rerender({ path: '/analytics' });
    expect(isHidden()).toBe(false);
  });

  // The layout reserves space for the dock at the end of every page. If the
  // dock stayed hidden there, that reservation would read as an empty gap.
  it('comes back at the end of the page even while scrolling down', () => {
    renderHook(() => useNavAutoHide('/expenses'));

    scrollTo(400);
    expect(isHidden()).toBe(true);

    scrollTo(BOTTOM_Y);
    expect(isHidden()).toBe(false);
  });

  it('still hides in the middle of a long page', () => {
    renderHook(() => useNavAutoHide('/expenses'));

    scrollTo(2000);
    expect(isHidden()).toBe(true);
  });

  it('clears the flag on unmount', () => {
    const { unmount } = renderHook(() => useNavAutoHide('/expenses'));

    scrollTo(400);
    unmount();
    expect(isHidden()).toBe(false);
  });
});
