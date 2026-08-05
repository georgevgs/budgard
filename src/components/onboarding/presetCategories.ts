type PresetCategory = {
  nameKey: string;
  color: string;
  icon: string;
};

export const PRESET_CATEGORIES: PresetCategory[] = [
  { nameKey: 'food', color: '#1fdb8a', icon: '🍔' },
  { nameKey: 'housing', color: '#7c4dff', icon: '🏠' },
  { nameKey: 'transport', color: '#00b8f5', icon: '🚗' },
  { nameKey: 'entertainment', color: '#ff5c35', icon: '🎬' },
  { nameKey: 'subscriptions', color: '#ff3da6', icon: '📱' },
  { nameKey: 'health', color: '#00c9b7', icon: '💊' },
  { nameKey: 'shopping', color: '#a855f7', icon: '👕' },
  { nameKey: 'utilities', color: '#ffb800', icon: '💡' },
];
