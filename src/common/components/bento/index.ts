// The bento grid language, grouped: these three are always reached for
// together when a screen is built, and they are small, stable and eagerly
// used, so the barrel costs no code splitting.
//
// Deliberately the only barrel in the app. `dataOps/` is 20 modules that
// change most weeks, and the chart and dialog folders hold components that
// are lazily imported on purpose — a barrel over either would pull the whole
// folder into every chunk that touched one file. See docs/style-guide.md.
export { BentoGrid } from '@/common/components/bento/BentoGrid';
export { BentoTile } from '@/common/components/bento/BentoTile';
export { TileLabel } from '@/common/components/bento/TileLabel';
