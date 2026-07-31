type PresetCategory = {
  nameKey: string;
  color: string;
  icon: string;
};

export const PRESET_CATEGORIES: PresetCategory[] = [
  { nameKey: 'food', color: '#22c55e', icon: '🍔' },
  { nameKey: 'housing', color: '#6366f1', icon: '🏠' },
  { nameKey: 'transport', color: '#3b82f6', icon: '🚗' },
  { nameKey: 'entertainment', color: '#f97316', icon: '🎬' },
  { nameKey: 'subscriptions', color: '#ec4899', icon: '📱' },
  { nameKey: 'health', color: '#14b8a6', icon: '💊' },
  { nameKey: 'shopping', color: '#8b5cf6', icon: '👕' },
  { nameKey: 'utilities', color: '#f59e0b', icon: '💡' },
];
