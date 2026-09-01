import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Search from 'lucide-react/dist/esm/icons/search';
import { Input } from '@/components/ui/input';

type Props = {
  search: string;
  isSearchingAllTime: boolean;
  onSearchChange: (value: string) => void;
  /** Sits beside search — the single entry point for every refinement. */
  trailing?: ReactNode;
};

const ActivityFilters = ({
  search,
  isSearchingAllTime,
  onSearchChange,
  trailing,
}: Props) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
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
            className="h-10 w-full rounded-full border-0 bg-tile pl-9.5 text-base shadow-[inset_0_0_0_1px_hsl(var(--tile-ring))] placeholder:text-[0.6875rem] sm:text-sm"
          />
        </div>
        {trailing}
      </div>
      {renderSearchScope(isSearchingAllTime, t)}
    </div>
  );
};

export default ActivityFilters;

// --- Helpers ---

const renderSearchScope = (
  isSearchingAllTime: boolean,
  t: (key: string) => string,
) => {
  if (!isSearchingAllTime) {
    return null;
  }

  return (
    <p className="px-2 text-xs text-muted-foreground" role="status">
      {t('activity.searchScope')}
    </p>
  );
};
