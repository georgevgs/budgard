import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, extractEmoji } from '@/lib/utils';

const CATEGORY_ICONS = [
  '🍔', '🛒', '🏠', '🚗', '🎬', '💊', '👕', '💡',
  '🎮', '✈️', '📱', '🎓', '💇', '🐾', '🎁', '☕',
  '🍕', '🍺', '🏋️', '💼', '🎵', '📚', '🧹', '👶',
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

  const handleCustomChange = (raw: string) => {
    const emoji = extractEmoji(raw);
    onChange(emoji || undefined);
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
              'w-9 h-9 rounded-full transition-all duration-150 flex items-center justify-center text-lg',
              renderIconButtonState(value === emoji),
            )}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Input
          value={value ?? ''}
          onChange={(e) => handleCustomChange(e.target.value)}
          disabled={disabled}
          placeholder={t('categories.customIcon')}
          className="h-7 w-32 text-sm px-2"
          maxLength={4}
          aria-label={t('categories.customIcon')}
        />
        {renderClearButton(value, handleClear, disabled, t)}
      </div>
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
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs text-muted-foreground"
      onClick={onClear}
      disabled={disabled}
    >
      {t('common.clear')}
    </Button>
  );
};
