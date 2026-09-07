import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePullToRefresh } from '@/common/hooks/usePullToRefresh';

// The Vibration API does not exist in jsdom, and the arm tick is not what these
// tests are about.
vi.mock('@/constants/haptics', () => ({
  haptics: { selection: vi.fn() },
}));

// jsdom ships no TouchEvent constructor, and the hook only ever reads
// `touches[0]`, `cancelable` and `target`.
const touch = (type: string, x: number, y: number): Event => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', {
    value: [{ clientX: x, clientY: y }],
  });

  return event;
};

const pull = (from: number, to: number) => {
  act(() => {
    document.dispatchEvent(touch('touchstart', 0, from));
  });
  act(() => {
    document.dispatchEvent(touch('touchmove', 0, to));
  });
};

const release = () => {
  act(() => {
    document.dispatchEvent(touch('touchend', 0, 0));
  });
};

const root = () => document.documentElement;

// resist() is asymptotic, so the finger has to travel further than the trigger
// to reach it: 64px of travel needs roughly 90px of finger.
const PAST_TRIGGER = 200;
const SHORT_OF_TRIGGER = 30;

describe('usePullToRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.scrollY = 0;
    document.body.removeAttribute('data-scroll-locked');
    document.body.removeAttribute('data-today-arranging');
  });

  afterEach(() => {
    vi.useRealTimers();
    delete root().dataset.pull;
    root().style.removeProperty('--pull-y');
    root().style.removeProperty('--pull-progress');
  });

  it('does not touch the document while disabled', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePullToRefresh({ onRefresh, isEnabled: false }));

    pull(0, PAST_TRIGGER);

    expect(root().dataset.pull).toBeUndefined();
    release();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('paints the pull once the finger commits downward', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePullToRefresh({ onRefresh }));

    pull(0, PAST_TRIGGER);

    expect(root().dataset.pull).toBe('armed');
    expect(root().style.getPropertyValue('--pull-y')).not.toBe('');
  });

  it('refreshes when a pull past the trigger is released', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh({ onRefresh }));

    pull(0, PAST_TRIGGER);
    release();

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.isRefreshing).toBe(true);
  });

  // A refetch answered from cache resolves in under a frame; the spinner is
  // held so the result reads as "refreshed" rather than as a flicker.
  it('holds the indicator for the minimum before clearing it', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh({ onRefresh }));

    pull(0, PAST_TRIGGER);
    release();
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isRefreshing).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(result.current.isRefreshing).toBe(false);
  });

  it('does not refresh when the pull never reaches the trigger', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePullToRefresh({ onRefresh }));

    pull(0, SHORT_OF_TRIGGER);
    release();

    expect(onRefresh).not.toHaveBeenCalled();
  });

  // Without the direction lock a sideways swipe across the category chips
  // dragged the whole page down with it.
  it('ignores a mostly sideways swipe', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePullToRefresh({ onRefresh }));

    act(() => {
      document.dispatchEvent(touch('touchstart', 0, 0));
    });
    act(() => {
      document.dispatchEvent(touch('touchmove', 120, 20));
    });
    release();

    expect(onRefresh).not.toHaveBeenCalled();
    expect(root().dataset.pull).toBeUndefined();
  });

  it('refuses to start when the page is not at the top', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePullToRefresh({ onRefresh }));
    window.scrollY = 240;

    pull(0, PAST_TRIGGER);
    release();

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('refuses to start under a sheet that has locked the body', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePullToRefresh({ onRefresh }));
    document.body.setAttribute('data-scroll-locked', '');

    pull(0, PAST_TRIGGER);
    release();

    expect(onRefresh).not.toHaveBeenCalled();
  });

  // A transform on the document element creates a containing block for every
  // fixed-position descendant, so none of it may outlive the hook.
  it('takes everything back off the document on unmount', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => usePullToRefresh({ onRefresh }));

    pull(0, PAST_TRIGGER);
    unmount();

    expect(root().dataset.pull).toBeUndefined();
    expect(root().style.getPropertyValue('--pull-y')).toBe('');
    expect(root().style.getPropertyValue('--pull-progress')).toBe('');
  });
});
