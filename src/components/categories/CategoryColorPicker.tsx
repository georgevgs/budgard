import { useTranslation } from 'react-i18next';
import Check from 'lucide-react/dist/esm/icons/check';
import { Input } from '@/components/ui/input';
import { dataColors } from '@/design/palette';
import { cn } from '@/lib/utils';

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
        {dataColors.map((color) => (
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
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground">
      <Check className="h-3.5 w-3.5 text-background" />
    </span>
  );
};
