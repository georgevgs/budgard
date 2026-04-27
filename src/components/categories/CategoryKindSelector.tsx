import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type CategoryKind = 'need' | 'want' | 'savings';

type KindOption = {
  value: CategoryKind;
  targetPct: number;
  activeClasses: string;
};

const KIND_OPTIONS: KindOption[] = [
  {
    value: 'need',
    targetPct: 50,
    activeClasses: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  },
  {
    value: 'want',
    targetPct: 30,
    activeClasses: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  },
  {
    value: 'savings',
    targetPct: 20,
    activeClasses: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
];

const INACTIVE_CLASSES =
  'border-border/60 text-muted-foreground hover:bg-accent/50';

type CategoryKindSelectorProps = {
  value: CategoryKind | undefined;
  onChange: (kind: CategoryKind | undefined) => void;
  disabled?: boolean;
};

const CategoryKindSelector = ({
  value,
  onChange,
  disabled,
}: CategoryKindSelectorProps) => {
  const { t } = useTranslation();

  const handleClick = (option: CategoryKind) => {
    onChange(toggleKind(value, option));
  };

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{t('categories.kind.label')}</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {t('categories.kind.helpText')}
      </p>
      <div className="grid grid-cols-3 gap-2 pt-1">
        {KIND_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleClick(option.value)}
            disabled={disabled}
            className={cn(
              'rounded-xl py-2.5 px-3 border text-sm transition-colors',
              renderKindButtonState(value === option.value, option.activeClasses),
            )}
          >
            <div className="font-medium">
              {t(`categories.kind.${option.value}`)}
            </div>
            <div className="text-xs opacity-80 mt-0.5">{option.targetPct}%</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryKindSelector;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toggleKind = (
  current: CategoryKind | undefined,
  next: CategoryKind,
): CategoryKind | undefined => {
  if (current === next) return undefined;

  return next;
};

const renderKindButtonState = (isSelected: boolean, activeClasses: string) => {
  if (isSelected) return `${activeClasses} border-transparent`;

  return INACTIVE_CLASSES;
};
