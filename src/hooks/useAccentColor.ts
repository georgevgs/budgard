import { useEffect, useState } from 'react';

import {
  ACCENTS,
  ACCENT_FOREGROUND,
  ACCENT_PROPERTIES,
  DEFAULT_ACCENT,
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

/** Swatch shown in Settings — always the accent's light-theme value. */
export const accentSwatch = (accent: AccentColor): string =>
  `hsl(${accent.light})`;

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

const resolveColor = (accent: AccentColor): string => {
  if (document.documentElement.classList.contains('dark')) {
    return accent.dark;
  }

  return accent.light;
};

// --primary drives everything the accent touches — buttons, the nav indicator,
// the FAB, the Today hero tint and the page glow — so there is exactly one
// value to override and one to clear.
const applyAccentToDocument = (key: AccentColorKey): void => {
  const root = document.documentElement;

  // Barbie theme has its own fixed palette — don't override
  if (root.getAttribute('data-theme') === 'barbie') {
    for (const property of ACCENT_PROPERTIES) {
      root.style.removeProperty(property);
    }

    return;
  }

  const color = resolveColor(findAccent(key));

  root.style.setProperty('--primary', color);
  root.style.setProperty('--primary-foreground', ACCENT_FOREGROUND);
  root.style.setProperty('--ring', color);
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
