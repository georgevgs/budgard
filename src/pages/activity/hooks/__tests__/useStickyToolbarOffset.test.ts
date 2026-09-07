import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStickyToolbarOffset } from '@/pages/activity/hooks/useStickyToolbarOffset';

// jsdom has no ResizeObserver. A no-op stand-in is enough here — these tests
// are about the initial synchronous measurement, not resize callbacks.
class FakeResizeObserver {
  observe() {}
  disconnect() {}
}

const makeToolbar = (height: number): HTMLDivElement => {
  const element = document.createElement('div');
  element.getBoundingClientRect = () =>
    ({ height }) as DOMRect;

  return element;
};

describe('useStickyToolbarOffset', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('measures the toolbar once the ref attaches on the first commit', () => {
    const { result } = renderHook(() => useStickyToolbarOffset());

    expect(result.current.height).toBe(0);

    act(() => {
      result.current.ref(makeToolbar(100));
    });

    expect(result.current.height).toBe(100);
  });

  // ActivityView calls this hook before its own `isInitialized` check, so on
  // a cold load straight into Activity the first commit is a loading
  // skeleton with no toolbar in the tree — the ref attaches to nothing, then
  // attaches for real once the skeleton is replaced. A plain `useRef` read
  // inside a `[]`-deps effect never got a second look at that later
  // attachment and stayed at 0 for the rest of the session; the sticky day
  // headers then pinned under the toolbar instead of below it.
  it('still measures the toolbar when the ref attaches after a null first commit', () => {
    const { result } = renderHook(() => useStickyToolbarOffset());

    // The loading-skeleton commit: nothing to attach the ref to yet.
    act(() => {
      result.current.ref(null);
    });
    expect(result.current.height).toBe(0);

    // The real content replaces the skeleton and the ref attaches for real.
    act(() => {
      result.current.ref(makeToolbar(100));
    });

    expect(result.current.height).toBe(100);
  });
});
