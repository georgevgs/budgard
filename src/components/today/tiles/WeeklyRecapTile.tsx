import BentoTile from '@/components/bento/BentoTile';
import WeeklyRecapCard from '@/components/recap/WeeklyRecapCard';
import { useWeeklyRecap } from '@/hooks/useWeeklyRecap';

// The recap only exists on a Monday, and only when the week before it had
// something worth saying. The card knows that and returns null — but a null
// inside a grid cell is still a cell, so the emptiness has to be decided out
// here, before the cell is drawn.
const WeeklyRecapTile = () => {
  const { recap, isDismissed } = useWeeklyRecap();

  if (isDismissed) {
    return null;
  }
  if (!recap || recap.anomalies.length === 0) {
    return null;
  }

  return (
    <BentoTile tone="bare" wide>
      <WeeklyRecapCard />
    </BentoTile>
  );
};

export default WeeklyRecapTile;
