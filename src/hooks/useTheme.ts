import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'barbie';

const getInitialTheme = (): Theme => {
  try {
    const savedTheme = localStorage.getItem('theme');

    if (
      savedTheme === 'light' ||
      savedTheme === 'dark' ||
      savedTheme === 'barbie'
    ) {
      return savedTheme;
    }

    return 'light';
  } catch {
    return 'light';
  }
};

const applyThemeToDocument = (theme: Theme): void => {
  const root = window.document.documentElement;
  root.setAttribute('data-theme', theme);

  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Update meta theme-color to match the current theme's background
  requestAnimationFrame(() => {
    const bgHsl = getComputedStyle(root)
      .getPropertyValue('--background')
      .trim();
    if (!bgHsl) return;

    // Remove media-specific tags and use a single dynamic one
    document
      .querySelectorAll('meta[name="theme-color"][media]')
      .forEach((el) => el.remove());

    const existing = document.querySelector(
      'meta[name="theme-color"]:not([media])',
    );
    if (existing) {
      existing.setAttribute('content', `hsl(${bgHsl})`);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = `hsl(${bgHsl})`;
      document.head.appendChild(meta);
    }
  });
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // localStorage may be unavailable
    }
    applyThemeToDocument(theme);
  }, [theme]);

  return { theme, setTheme };
}
