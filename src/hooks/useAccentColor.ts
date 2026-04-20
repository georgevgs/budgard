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
  | 'sunset'
  | 'ocean'
  | 'lavender'
  | 'mint'
  | 'coral'
  | 'gold'
  | 'slate';

type AccentColorOption = {
  key: AccentColorKey;
  values: AccentValues;
};

/**
 * Each accent is hand-tuned per theme so it sits naturally against:
 *   light — cool-gray bg (220 20% 97%), white cards
 *   dark  — deep navy bg (224 20% 7%), dark cards
 *
 * Saturations are moderate (55-75%) to feel refined, not neon.
 * Dark-mode lightness is bumped for legibility on dark surfaces.
 * Barbie theme keeps its own fixed pink palette (accent picker is hidden).
 */
export const ACCENT_COLORS: AccentColorOption[] = [
  {
    key: 'sunset',
    values: {
      light: { primary: '24 75% 50%', primaryFg: '0 0% 100%' },
      dark: { primary: '22 78% 58%', primaryFg: '24 40% 6%' },

      swatch: 'hsl(24 75% 50%)',
    },
  },
  {
    key: 'ocean',
    values: {
      light: { primary: '215 68% 50%', primaryFg: '0 0% 100%' },
      dark: { primary: '213 70% 62%', primaryFg: '215 45% 6%' },

      swatch: 'hsl(215 68% 50%)',
    },
  },
  {
    key: 'lavender',
    values: {
      light: { primary: '262 60% 56%', primaryFg: '0 0% 100%' },
      dark: { primary: '264 58% 66%', primaryFg: '262 35% 6%' },

      swatch: 'hsl(262 60% 56%)',
    },
  },
  {
    key: 'mint',
    values: {
      light: { primary: '162 55% 38%', primaryFg: '0 0% 100%' },
      dark: { primary: '160 50% 50%', primaryFg: '162 35% 6%' },

      swatch: 'hsl(162 55% 38%)',
    },
  },
  {
    key: 'coral',
    values: {
      light: { primary: '350 62% 52%', primaryFg: '0 0% 100%' },
      dark: { primary: '348 58% 62%', primaryFg: '350 35% 6%' },

      swatch: 'hsl(350 62% 52%)',
    },
  },
  {
    key: 'gold',
    values: {
      light: { primary: '40 70% 46%', primaryFg: '0 0% 100%' },
      dark: { primary: '42 65% 55%', primaryFg: '40 40% 6%' },

      swatch: 'hsl(40 70% 46%)',
    },
  },
  {
    key: 'slate',
    values: {
      light: { primary: '220 20% 42%', primaryFg: '0 0% 100%' },
      dark: { primary: '218 18% 58%', primaryFg: '220 15% 6%' },

      swatch: 'hsl(220 20% 42%)',
    },
  },
];

const DEFAULT_ACCENT: AccentColorKey = 'sunset';
const STORAGE_KEY = 'accent-color';

const findAccent = (key: string): AccentColorOption =>
  ACCENT_COLORS.find((c) => c.key === key) ?? ACCENT_COLORS[0];

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
    root.style.removeProperty('--chart-1');

    return;
  }

  const accent = findAccent(key);
  const { primary, primaryFg } = resolveThemeValues(accent);

  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-foreground', primaryFg);
  root.style.setProperty('--ring', primary);
  root.style.setProperty('--chart-1', primary);
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
