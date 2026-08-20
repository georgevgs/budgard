import { swatch } from '@/design/palette';
type PresetCategory = {
  nameKey: string;
  color: string;
  icon: string;
};

export const PRESET_CATEGORIES: PresetCategory[] = [
  { nameKey: 'food', color: swatch.mint, icon: '🍔' },
  { nameKey: 'housing', color: swatch.violet, icon: '🏠' },
  { nameKey: 'transport', color: swatch.sky, icon: '🚗' },
  { nameKey: 'entertainment', color: swatch.flame, icon: '🎬' },
  { nameKey: 'subscriptions', color: swatch.pink, icon: '📱' },
  { nameKey: 'health', color: swatch.aqua, icon: '💊' },
  { nameKey: 'shopping', color: swatch.purple, icon: '👕' },
  { nameKey: 'utilities', color: swatch.gold, icon: '💡' },
];
