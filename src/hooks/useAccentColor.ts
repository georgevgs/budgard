import { useEffect, useState } from 'react';

import {
  ACCENTS,
  ACCENT_PROPERTIES,
  DEFAULT_ACCENT,
  accentValues,
  type AccentColor,
  type AccentColorKey,
} from '@/design/tokens';

export type { AccentColorKey } from '@/design/tokens';

/**
 * The accent picker. Values live in src/design/tokens.ts — the same module the
 * generated CSS and the pre-paint script in index.html are built from, so an
 * accent can no longer be right in one place and stale in another.
 */
export const ACCENT_COLORS = ACCENTS;

const STORAGE_KEY = 'accent-color';

const findAccent = (key: string): AccentColor =>
  ACCENTS.find((color) => color.key === key) ?? ACCENTS[0];

/** Dot shown in Settings — always the accent's light-theme fill, so the
 *  picker keeps the same colours whichever theme is on. */
export const accentSwatch = (accent: AccentColor): string =>
  `hsl(${accent.swatch.solid})`;

const getInitialKey = (): AccentColorKey => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ACCENTS.some((color) => color.key === saved)) {
      return saved as AccentColorKey;
    }
  } catch {
    // localStorage may be unavailable
  }

  return DEFAULT_ACCENT;
};

// The accent owns four properties, not one: the neon fill, the ink that rides
// on it, the readable-on-canvas variant behind every `text-primary-ink`, and
// the focus ring. Writing only the fill is what used to leave orange links on
// a blue theme. `accentValues` returns them in ACCENT_PROPERTIES order so the
// pre-paint script in index.html and this hook can never disagree.
const applyAccentToDocument = (key: AccentColorKey): void => {
  const root = document.documentElement;

  // Barbie theme has its own fixed palette — don't override
  if (root.getAttribute('data-theme') === 'barbie') {
    for (const property of ACCENT_PROPERTIES) {
      root.style.removeProperty(property);
    }

    return;
  }

  const isDark = root.classList.contains('dark');
  let increasedContrast = false;
  if (window.matchMedia) {
    increasedContrast = window.matchMedia('(prefers-contrast: more)').matches;
  }
  const values = accentValues(
    findAccent(key).swatch,
    isDark,
    increasedContrast,
  );

  ACCENT_PROPERTIES.forEach((property, index) => {
    root.style.setProperty(property, values[index]);
  });
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

  useEffect(() => {
    if (!window.matchMedia) {
      return;
    }

    const contrast = window.matchMedia('(prefers-contrast: more)');
    const reapplyAccent = () => applyAccentToDocument(accent);
    contrast.addEventListener('change', reapplyAccent);

    return () => contrast.removeEventListener('change', reapplyAccent);
  }, [accent]);

  return { accent, setAccent };
};
