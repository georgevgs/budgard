import { useTranslation } from 'react-i18next';
import Check from 'lucide-react/dist/esm/icons/check';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS = [
  '#f43f5e',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f472b6',
  '#fb923c',
  '#64748b',
  '#78716c',
  '#a8a29e',
  '#9ca3af',
  '#1e293b',
  '#334155',
] as const;

const HEX_PATTERN = /^#[0-9A-Fa-f]{0,6}$/;

type CategoryColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
};

const CategoryColorPicker = ({
  value,
  onChange,
  disabled,
}: CategoryColorPickerProps) => {
  const { t } = useTranslation();

  const handleHexChange = (raw: string) => {
    if (!HEX_PATTERN.test(raw)) return;

    onChange(raw);
  };

  return (
    <>
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 pt-1">
        {CATEGORY_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            disabled={disabled}
            aria-label={t('categories.selectColorAria', { color })}
            className={cn(
              'w-9 h-9 rounded-full transition-all duration-150 flex items-center justify-center',
              renderColorButtonState(value === color),
            )}
            style={{ backgroundColor: color }}
          >
            {renderSwatchCheck(value === color)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <div
          className="w-5 h-5 rounded-full shrink-0 transition-colors duration-150"
          style={{ backgroundColor: value }}
          aria-hidden="true"
        />
        <Input
          value={value}
          onChange={(e) => handleHexChange(e.target.value)}
          disabled={disabled}
          className="h-7 w-24 text-xs font-mono tabular-nums px-2"
          maxLength={7}
          aria-label={t('categories.customColor')}
        />
      </div>
    </>
  );
};

export default CategoryColorPicker;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const renderColorButtonState = (isSelected: boolean) => {
  if (isSelected) return 'ring-2 ring-offset-2 ring-foreground scale-110';

  return 'opacity-70 hover:opacity-100 hover:scale-105';
};

const renderSwatchCheck = (isSelected: boolean) => {
  if (!isSelected) return null;

  return <Check className="h-3.5 w-3.5 text-white drop-shadow" />;
};
