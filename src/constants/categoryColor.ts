// Category, tag, goal, debt and account colours are user-picked hues stored as
// raw hex, so they are the one part of the UI the design tokens cannot own.
// What they CAN own is how those hues are tinted: every chip used to append
// `20` to the hex — 12.5% alpha over whatever sat behind it — which lands as a
// pale wash on a light card and an almost invisible smudge on a dark one.
// Mixing into the card token instead keeps the tint legible in both themes,
// because the thing being mixed towards flips with the theme.
export const getColorTint = (color: string | null | undefined): string => {
  if (!color) {
    return 'hsl(var(--muted))';
  }

  return `color-mix(in oklab, ${color} 22%, hsl(var(--card)))`;
};
