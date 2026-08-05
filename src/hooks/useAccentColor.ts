import { useEffect, useState } from 'react';

type ThemeValues = {
  primary: string;
  primaryFg: string;
};

type AccentValues = {
  light: ThemeValues;
  dark: ThemeValues;
  swatch: string;
};

export type AccentColorKey =
  'sunset' | 'ocean' | 'lavender' | 'mint' | 'coral' | 'gold' | 'slate';

type AccentColorOption = {
  key: AccentColorKey;
  values: AccentValues;
};

/**
 * Each accent is hand-tuned per theme so it sits naturally against:
 *   light — cool lilac canvas, white cards
 *   dark  — deep plum canvas, ink-purple cards
 *
 * Saturation stays intentionally high. The brightest hues use ink-colored
 * foregrounds, so primary controls feel luminous without losing their label.
 * Barbie theme keeps its own fixed pink palette (accent picker is hidden).
 */
export const ACCENT_COLORS: AccentColorOption[] = [
  {
    key: 'sunset',
    values: {
      light: { primary: '15 100% 61%', primaryFg: '248 32% 12%' },
      dark: { primary: '15 100% 65%', primaryFg: '252 45% 9%' },

      swatch: 'hsl(15 100% 61%)',
    },
  },
  {
    key: 'ocean',
    values: {
      light: { primary: '199 100% 48%', primaryFg: '205 90% 12%' },
      dark: { primary: '195 100% 65%', primaryFg: '205 90% 10%' },

      swatch: 'hsl(199 100% 48%)',
    },
  },
  {
    key: 'lavender',
    values: {
      light: { primary: '257 92% 62%', primaryFg: '0 0% 100%' },
      dark: { primary: '258 100% 72%', primaryFg: '252 45% 9%' },

      swatch: 'hsl(257 92% 62%)',
    },
  },
  {
    key: 'mint',
    values: {
      light: { primary: '162 83% 40%', primaryFg: '164 80% 10%' },
      dark: { primary: '160 86% 50%', primaryFg: '164 80% 8%' },

      swatch: 'hsl(162 83% 40%)',
    },
  },
  {
    key: 'coral',
    values: {
      light: { primary: '340 100% 61%', primaryFg: '0 0% 100%' },
      dark: { primary: '340 100% 68%', primaryFg: '340 60% 9%' },

      swatch: 'hsl(340 100% 61%)',
    },
  },
  {
    key: 'gold',
    values: {
      light: { primary: '43 100% 51%', primaryFg: '34 85% 12%' },
      dark: { primary: '45 100% 60%', primaryFg: '34 85% 10%' },

      swatch: 'hsl(43 100% 51%)',
    },
  },
  {
    key: 'slate',
    values: {
      light: { primary: '235 24% 44%', primaryFg: '0 0% 100%' },
      dark: { primary: '231 24% 65%', primaryFg: '240 28% 9%' },

      swatch: 'hsl(235 24% 44%)',
    },
  },
];

const DEFAULT_ACCENT: AccentColorKey = 'lavender';
const STORAGE_KEY = 'accent-color';

const findAccent = (key: string): AccentColorOption =>
  ACCENT_COLORS.find((color) => color.key === key) ?? ACCENT_COLORS[2];

const getInitialKey = (): AccentColorKey => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ACCENT_COLORS.some((c) => c.key === saved)) {
      return saved as AccentColorKey;
    }
  } catch {
    // localStorage may be unavailable
  }

  return DEFAULT_ACCENT;
};

const resolveThemeValues = (accent: AccentColorOption): ThemeValues => {
  if (document.documentElement.classList.contains('dark')) {
    return accent.values.dark;
  }

  return accent.values.light;
};

const applyAccentToDocument = (key: AccentColorKey): void => {
  const root = document.documentElement;

  // Barbie theme has its own fixed palette — don't override
  if (root.getAttribute('data-theme') === 'barbie') {
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-foreground');
    root.style.removeProperty('--ring');

    return;
  }

  const accent = findAccent(key);
  const { primary, primaryFg } = resolveThemeValues(accent);

  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-foreground', primaryFg);
  root.style.setProperty('--ring', primary);
};

export const useAccentColor = (): {
  accent: AccentColorKey;
  setAccent: (key: AccentColorKey) => void;
} => {
  const [accent, setAccentState] = useState<AccentColorKey>(getInitialKey);

  const setAccent = (key: AccentColorKey): void => {
    setAccentState(key);
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      // localStorage may be unavailable
    }
  };

  useEffect(() => {
    applyAccentToDocument(accent);
  }, [accent]);

  // Re-apply when theme changes (via MutationObserver on data-theme / class)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      applyAccentToDocument(accent);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });

    return () => observer.disconnect();
  }, [accent]);

  return { accent, setAccent };
};
