import type { ReactNode } from 'react';
import ActivityFilters from '@/components/activity/ActivityFilters';
import ActivityMonthStepper from '@/components/activity/ActivityMonthStepper';
import type { ActivityPeriod } from '@/hooks/activity/useActivityFeed';

type Props = {
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
// `adaptive-material` makes the toolbar opaque when reduced transparency is enabled.
const ActivityToolbar = ({
  search,
  isSearchingAllTime,
  onSearchChange,
  period,
  selectedMonth,
  onMonthChange,
  filterPanel,
}: Props) => {
  return (
    <div className="adaptive-material sticky top-[env(safe-area-inset-top)] z-20 mt-3 space-y-2 bg-background/82 py-2 backdrop-blur-md">
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
