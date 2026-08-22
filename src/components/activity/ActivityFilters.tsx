import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Search from 'lucide-react/dist/esm/icons/search';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ActivityKind } from '@/hooks/activity/useActivityFeed';

type Props = {
  search: string;
  kind: ActivityKind;
  onSearchChange: (value: string) => void;
  onKindChange: (value: ActivityKind) => void;
  /** Sits beside the search box — the category/tag filter entry point. */
  trailing?: ReactNode;
};

const ActivityFilters = ({
  search,
  kind,
  onSearchChange,
  onKindChange,
  trailing,
}: Props) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('activity.searchPlaceholder')}
            aria-label={t('activity.searchLabel')}
            className="h-11 w-full rounded-xl border-input bg-card pl-9 shadow-none"
          />
        </div>
        {trailing}
      </div>
      <div
        className="grid grid-cols-3 rounded-full border border-border bg-muted/72 p-1"
        role="group"
        aria-label={t('activity.filterLabel')}
      >
        {renderFilterButton('all', kind, onKindChange, t)}
        {renderFilterButton('expense', kind, onKindChange, t)}
        {renderFilterButton('income', kind, onKindChange, t)}
      </div>
    </div>
  );
};

export default ActivityFilters;

// --- Helpers ---

type TFunc = (key: string) => string;

const renderFilterButton = (
  value: ActivityKind,
  current: ActivityKind,
  onChange: (value: ActivityKind) => void,
  t: TFunc,
) => {
  const isActive = current === value;

  return (
    <button
      key={value}
      type="button"
      onClick={() => onChange(value)}
      aria-pressed={isActive}
      className={cn(
        'min-h-10 rounded-full px-3 text-xs font-semibold transition-[color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        getButtonTone(isActive),
      )}
    >
      {t(`activity.filters.${value}`)}
    </button>
  );
};

const getButtonTone = (isActive: boolean): string => {
  if (isActive) {
    return 'bg-card text-foreground shadow-sm';
  }

  return 'text-muted-foreground';
};
