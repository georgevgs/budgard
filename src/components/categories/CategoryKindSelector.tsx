import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { CategoryKind } from '@/types/Category';

// The kinds a person picks. 'income' is the fourth member of the canonical
// union and is deliberately not here: an income category is classified by
// being income, not by a choice in this control.
export type SelectableCategoryKind = Exclude<CategoryKind, 'income'>;

type KindOption = {
  value: SelectableCategoryKind;
  targetPct: number;
  activeClasses: string;
};

// These have to be the SAME three colours `FiftyThirtyTwentyRing` gives the
// buckets, because this is the control that fills that chart: pick "Need"
// here and the share it lands in over there has to be recognisably the same
// thing. They were blue / gold / green — `--info` and `--warning` borrowed as
// categorical hues — while the chart drew the same three buckets in
// near-black / orange / green, so the picker and the chart disagreed about
// what a need looks like.
const KIND_OPTIONS: KindOption[] = [
  {
    value: 'need',
    targetPct: 50,
    activeClasses: 'bg-foreground/10 text-foreground',
  },
  {
    value: 'want',
    targetPct: 30,
    activeClasses: 'bg-primary/15 text-primary-ink',
  },
  {
    value: 'savings',
    targetPct: 20,
    activeClasses: 'bg-income/15 text-income-ink',
  },
];

const INACTIVE_CLASSES =
  'border-border/60 text-muted-foreground hover:bg-accent/50';

type CategoryKindSelectorProps = {
  value: SelectableCategoryKind | undefined;
  onChange: (kind: SelectableCategoryKind | undefined) => void;
  disabled?: boolean;
};

const CategoryKindSelector = ({
  value,
  onChange,
  disabled,
}: CategoryKindSelectorProps) => {
  const { t } = useTranslation();

  const handleClick = (option: SelectableCategoryKind) => {
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
  current: SelectableCategoryKind | undefined,
  next: SelectableCategoryKind,
): SelectableCategoryKind | undefined => {
  if (current === next) return undefined;

  return next;
};

const renderKindButtonState = (isSelected: boolean, activeClasses: string) => {
  if (isSelected) return `${activeClasses} border-transparent`;

  return INACTIVE_CLASSES;
};
