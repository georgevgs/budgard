import { useCallback, useEffect, useState } from 'react';
import { ACCENT_PROPERTIES } from '@/design/tokens';

export type Theme = 'system' | 'light' | 'dark' | 'barbie';

type ResolvedTheme = Exclude<Theme, 'system'>;

const STORAGE_KEY = 'theme';
const THEME_CHANGE_EVENT = 'budgard-theme-change';
const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

const isTheme = (value: string | null): value is Theme => {
  return (
    value === 'system' ||
    value === 'light' ||
    value === 'dark' ||
    value === 'barbie'
  );
};

const getInitialTheme = (): Theme => {
  try {
    const savedTheme = localStorage.getItem(STORAGE_KEY);

    if (isTheme(savedTheme)) {
      return savedTheme;
    }
  } catch {
    // Storage can be unavailable in private browsing.
  }

  return 'system';
};

const resolveTheme = (theme: Theme): ResolvedTheme => {
  if (theme !== 'system') {
    return theme;
  }

  if (!window.matchMedia) {
    return 'light';
  }

  if (window.matchMedia(DARK_MODE_QUERY).matches) {
    return 'dark';
  }

  return 'light';
};

const updateThemeColor = (root: HTMLElement): void => {
  requestAnimationFrame(() => {
    const background = getComputedStyle(root)
      .getPropertyValue('--background')
      .trim();
    if (!background) {
      return;
    }

    document
      .querySelectorAll('meta[name="theme-color"][media]')
      .forEach((element) => element.remove());

    const existing = document.querySelector(
      'meta[name="theme-color"]:not([media])',
    );
    if (existing) {
      existing.setAttribute('content', `hsl(${background})`);

      return;
    }

    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = `hsl(${background})`;
    document.head.appendChild(meta);
  });
};

const applyThemeToDocument = (theme: Theme): void => {
  const root = window.document.documentElement;
  const resolvedTheme = resolveTheme(theme);
  root.setAttribute('data-theme', resolvedTheme);
  root.setAttribute('data-theme-preference', theme);

  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Barbie has a fixed palette. The accent hook restores the selected accent
  // when the user leaves it because it observes both attributes above.
  if (resolvedTheme === 'barbie') {
    ACCENT_PROPERTIES.forEach((property) =>
      root.style.removeProperty(property),
    );
  }

  updateThemeColor(root);
};

const storeTheme = (theme: Theme): void => {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable in private browsing.
  }
};

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  const setTheme = useCallback((nextTheme: Theme): void => {
    storeTheme(nextTheme);
    setThemeState(nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    const syncTheme = () => setThemeState(getInitialTheme());
    const syncStoredTheme = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        syncTheme();
      }
    };

    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    window.addEventListener('storage', syncStoredTheme);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
      window.removeEventListener('storage', syncStoredTheme);
    };
  }, []);

  useEffect(() => {
    if (theme !== 'system') {
      return;
    }

    if (!window.matchMedia) {
      return;
    }

    const colorScheme = window.matchMedia(DARK_MODE_QUERY);
    const applySystemTheme = () => applyThemeToDocument('system');
    colorScheme.addEventListener('change', applySystemTheme);

    return () => colorScheme.removeEventListener('change', applySystemTheme);
  }, [theme]);

  return { theme, setTheme };
};
