import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useIgnoredSubscriptions,
  __resetIgnoredSubscriptionsCache,
} from './useIgnoredSubscriptions';

const STORAGE_KEY = 'budgard_ignored_subscriptions';

describe('useIgnoredSubscriptions', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    __resetIgnoredSubscriptionsCache();
  });

  it('starts empty when nothing is persisted', () => {
    const { result } = renderHook(() => useIgnoredSubscriptions());
    expect(result.current.ignored.size).toBe(0);
  });

  it('adds a key to the ignored set', () => {
    const { result } = renderHook(() => useIgnoredSubscriptions());

    act(() => {
      result.current.ignore('spotify premium');
    });

    expect(result.current.ignored.has('spotify premium')).toBe(true);
  });

  it('persists the ignored set across mounts', () => {
    const first = renderHook(() => useIgnoredSubscriptions());
    act(() => {
      first.result.current.ignore('netflix');
    });
    first.unmount();
    __resetIgnoredSubscriptionsCache();

    const second = renderHook(() => useIgnoredSubscriptions());
    expect(second.result.current.ignored.has('netflix')).toBe(true);
  });

  it('unignore removes the key', () => {
    const { result } = renderHook(() => useIgnoredSubscriptions());

    act(() => {
      result.current.ignore('netflix');
      result.current.unignore('netflix');
    });

    expect(result.current.ignored.has('netflix')).toBe(false);
  });

  it('ignoring an empty string is a no-op', () => {
    const { result } = renderHook(() => useIgnoredSubscriptions());

    act(() => {
      result.current.ignore('');
    });

    expect(result.current.ignored.size).toBe(0);
  });

  it('ignoring a duplicate key is a no-op', () => {
    const { result } = renderHook(() => useIgnoredSubscriptions());

    act(() => {
      result.current.ignore('hulu');
      result.current.ignore('hulu');
    });

    expect(result.current.ignored.size).toBe(1);
  });

  it('shares state across hook instances in the same tab', () => {
    const a = renderHook(() => useIgnoredSubscriptions());
    const b = renderHook(() => useIgnoredSubscriptions());

    act(() => {
      a.result.current.ignore('disney+');
    });

    expect(b.result.current.ignored.has('disney+')).toBe(true);
  });

  it('survives garbage in localStorage without throwing', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    __resetIgnoredSubscriptionsCache();

    const { result } = renderHook(() => useIgnoredSubscriptions());
    expect(result.current.ignored.size).toBe(0);
  });

  it('ignores non-array persisted payloads', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    __resetIgnoredSubscriptionsCache();

    const { result } = renderHook(() => useIgnoredSubscriptions());
    expect(result.current.ignored.size).toBe(0);
  });
});
