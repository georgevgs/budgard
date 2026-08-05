import { useTranslation } from 'react-i18next';
import Check from 'lucide-react/dist/esm/icons/check';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS = [
  '#ff4d6d',
  '#ff5c35',
  '#ff9500',
  '#ffb800',
  '#d7f52e',
  '#a6e22e',
  '#38e27d',
  '#1fdb8a',
  '#00c9b7',
  '#00d9f5',
  '#00b8f5',
  '#3d6bff',
  '#635bff',
  '#7c4dff',
  '#a855f7',
  '#d946ef',
  '#ff3da6',
  '#ff6bb5',
  '#ff7ad9',
  '#ff8e5e',
  '#00a896',
  '#5b8cff',
  '#8892b0',
  '#39415c',
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

  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm">
      <Check className="h-3.5 w-3.5 text-white drop-shadow" />
    </span>
  );
};
