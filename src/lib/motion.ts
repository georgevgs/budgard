// Reads the OS-level "reduce motion" accessibility preference.
// Returns false when matchMedia is unavailable (e.g. jsdom under tests) so
// animations keep their normal behavior in non-browser environments.

export const prefersReducedMotion = (): boolean => {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};
