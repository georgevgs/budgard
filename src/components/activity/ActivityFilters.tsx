import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Search from 'lucide-react/dist/esm/icons/search';
import { Input } from '@/components/ui/input';
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
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('activity.searchPlaceholder')}
            aria-label={t('activity.searchLabel')}
            /* Not `.tile`: the Input primitive carries its own `bg-card`
               utility, which outranks a component-layer class, so the surface
               has to be stated as utilities here to land at all. */
            className="h-10.5 w-full rounded-full border-0 bg-tile pl-9.5 text-base shadow-[inset_0_0_0_1px_hsl(var(--tile-ring))] placeholder:text-[0.6875rem] sm:text-sm"
          />
        </div>
        {trailing}
      </div>
      <div
        className="segmented grid w-full grid-cols-3"
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
      data-active={isActive}
      className="segmented-item cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {t(`activity.filters.${value}`)}
    </button>
  );
};
