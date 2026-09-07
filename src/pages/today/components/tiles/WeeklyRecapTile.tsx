import { WeeklyRecapCard } from '@/pages/today/components/WeeklyRecapCard';
import { useWeeklyRecap } from '@/pages/today/hooks/useWeeklyRecap';
import { BentoTile } from '@/common/components/bento';

// The recap only exists on a Monday, and only when the week before it had
// something worth saying. The card knows that and returns null — but a null
// inside a grid cell is still a cell, so the emptiness has to be decided out
// here, before the cell is drawn.
export const WeeklyRecapTile = () => {
  const { recap, isDismissed } = useWeeklyRecap();

  if (isDismissed) {
    return null;
  }
  if (!recap || recap.anomalies.length === 0) {
    return null;
  }

  return (
    <BentoTile tone="bare" isWide>
      <WeeklyRecapCard />
    </BentoTile>
  );
};
