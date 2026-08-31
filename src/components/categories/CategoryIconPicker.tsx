import { useTranslation } from 'react-i18next';
import CategoryIcon from '@/components/common/CategoryIcon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS = [
  '🍔',
  '🛒',
  '🏠',
  '🚗',
  '🎬',
  '💊',
  '👕',
  '💡',
  '🎮',
  '✈️',
  '📱',
  '🎓',
  '💇',
  '🐾',
  '🎁',
  '☕',
  '🍕',
  '🍺',
  '🏋️',
  '💼',
  '🎵',
  '📚',
  '🧹',
  '👶',
] as const;

type CategoryIconPickerProps = {
  value: string | undefined;
  onChange: (icon: string | undefined) => void;
  disabled?: boolean;
};

const CategoryIconPicker = ({
  value,
  onChange,
  disabled,
}: CategoryIconPickerProps) => {
  const { t } = useTranslation();

  const handleSelect = (icon: string) => {
    onChange(toggleIcon(value, icon));
  };

  const handleClear = () => {
    onChange(undefined);
  };

  return (
    <>
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 pt-1">
        {CATEGORY_ICONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleSelect(emoji)}
            disabled={disabled}
            aria-label={t('categories.selectIconAria', { icon: emoji })}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-full transition-all duration-150',
              renderIconButtonState(value === emoji),
            )}
          >
            <CategoryIcon icon={emoji} />
          </button>
        ))}
      </div>

      {renderClearButton(value, handleClear, disabled, t)}
    </>
  );
};

export default CategoryIconPicker;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const toggleIcon = (current: string | undefined, next: string) => {
  if (current === next) return undefined;

  return next;
};

const renderIconButtonState = (isSelected: boolean) => {
  if (isSelected) {
    return 'ring-2 ring-offset-2 ring-foreground bg-accent scale-110';
  }

  return 'opacity-70 hover:opacity-100 hover:scale-105 hover:bg-accent/50';
};

const renderClearButton = (
  value: string | undefined,
  onClear: () => void,
  disabled: boolean | undefined,
  t: TranslateFunction,
) => {
  if (!value) return null;

  return (
    <div className="pt-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-11 px-2 text-xs text-muted-foreground"
        onClick={onClear}
        disabled={disabled}
      >
        {t('common.clear')}
      </Button>
    </div>
  );
};
