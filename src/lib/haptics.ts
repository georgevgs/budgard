// Vibration API wrapper — mirrors iOS UIFeedbackGenerator / Material 3 haptic tokens.
// Honors a user opt-out and `prefers-reduced-motion: reduce` for accessibility.
// Note: iOS Safari does not implement the Vibration API and will silently no-op.

const STORAGE_KEY = 'haptics-enabled';

const canVibrate = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  return 'vibrate' in navigator;
};

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const isUserEnabled = (): boolean => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return true;

    return stored === 'true';
  } catch {
    return true;
  }
};

const shouldVibrate = (): boolean => {
  if (!canVibrate()) return false;
  if (prefersReducedMotion()) return false;

  return isUserEnabled();
};

const fire = (pattern: number | number[]): void => {
  if (!shouldVibrate()) return;
  navigator.vibrate(pattern);
};

export const haptics = {
  // Picker / toggle / theme change — barely-there tick
  selection: (): void => fire(5),
  // Primary tap — FAB, main action button
  light: (): void => fire(10),
  // Confirm — successful save (double-tap feel)
  success: (): void => fire([10, 40, 10]),
  // About-to-destruct — single firm pulse
  warning: (): void => fire(25),
  // Something went wrong — heavier double pulse
  error: (): void => fire([20, 80, 20]),
};

export const hapticsSettings = {
  isSupported: (): boolean => canVibrate(),
  isEnabled: (): boolean => isUserEnabled(),
  setEnabled: (enabled: boolean): void => {
    try {
      let stored: 'true' | 'false' = 'false';
      if (enabled) {
        stored = 'true';
      }

      localStorage.setItem(STORAGE_KEY, stored);
    } catch {
      // localStorage may be unavailable
    }
  },
};
