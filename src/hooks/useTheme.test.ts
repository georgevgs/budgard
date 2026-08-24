import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from '@/hooks/useTheme';

type ColorSchemeControl = {
  setDark: (isDark: boolean) => void;
};

const installColorScheme = (initiallyDark: boolean): ColorSchemeControl => {
  let isDark = initiallyDark;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const colorScheme = {
    get matches() {
      return isDark;
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (
      _type: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => listeners.add(listener),
    removeEventListener: (
      _type: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => listeners.delete(listener),
  } as unknown as MediaQueryList;

  vi.stubGlobal('matchMedia', () => colorScheme);

  return {
    setDark: (nextIsDark: boolean) => {
      isDark = nextIsDark;
      const event = { matches: isDark } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
};

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-preference');
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);

      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the iOS appearance by default', () => {
    installColorScheme(true);
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('system');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('follows system appearance changes while Automatic is selected', () => {
    const colorScheme = installColorScheme(false);
    renderHook(() => useTheme());

    act(() => colorScheme.setDark(true));

    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('keeps a manual choice when the system appearance changes', () => {
    const colorScheme = installColorScheme(false);
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme('light'));
    act(() => colorScheme.setDark(true));

    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('synchronizes the shell and Settings hook instances', () => {
    installColorScheme(false);
    const { result } = renderHook(() => {
      const shell = useTheme();
      const settings = useTheme();

      return { shell, settings };
    });

    act(() => result.current.settings.setTheme('dark'));

    expect(result.current.shell.theme).toBe('dark');
    expect(result.current.settings.theme).toBe('dark');
  });
});
