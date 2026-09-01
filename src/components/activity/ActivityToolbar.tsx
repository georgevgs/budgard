import type { ReactNode, Ref } from 'react';
import ActivityFilters from '@/components/activity/ActivityFilters';
import ActivityMonthStepper from '@/components/activity/ActivityMonthStepper';
import type { ActivityPeriod } from '@/hooks/activity/useActivityFeed';

type Props = {
  /** Measures the toolbar's rendered height for `useStickyToolbarOffset`. */
  containerRef: Ref<HTMLDivElement | null>;
  search: string;
  isSearchingAllTime: boolean;
  onSearchChange: (value: string) => void;
  period: ActivityPeriod;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  /** The ActivityFilterPanel trigger + dialog, built by the caller. */
  filterPanel: ReactNode;
};

// Search, the filter drawer and the month stepper used to be three rows a
// scroll would carry away one at a time. Pinning them together keeps every
// way to narrow the list reachable without a trip back to the top.
// `adaptive-material` opts this into the same reduced-transparency fallback
// as the day-group headers below it, so both go solid together under iOS's
// accessibility setting instead of one staying glassy against the other.
const ActivityToolbar = ({
  containerRef,
  search,
  isSearchingAllTime,
  onSearchChange,
  period,
  selectedMonth,
  onMonthChange,
  filterPanel,
}: Props) => {
  return (
    <div
      ref={containerRef}
      className="adaptive-material sticky top-[calc(var(--header-height)+env(safe-area-inset-top))] z-20 space-y-2 bg-background/82 py-2 backdrop-blur-md"
    >
      <ActivityFilters
        search={search}
        isSearchingAllTime={isSearchingAllTime}
        onSearchChange={onSearchChange}
        trailing={filterPanel}
      />
      <ActivityMonthStepper
        period={period}
        selectedMonth={selectedMonth}
        onMonthChange={onMonthChange}
      />
    </div>
  );
};

export default ActivityToolbar;
