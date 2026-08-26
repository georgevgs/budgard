import { useEffect, useState } from 'react';

const AFTERNOON_HOUR = 12;
const EVENING_HOUR = 18;
const MINIMUM_DELAY_MS = 1_000;

// Keeps calendar-sensitive screens honest without running a minute-by-minute
// clock. The only visible time-of-day changes are the greeting boundaries;
// midnight also advances every daily and monthly calculation.
export const useCurrentDate = (): Date => {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setCurrentDate(new Date());
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      refresh();
    };
    const timer = window.setTimeout(refresh, getNextRefreshDelay(currentDate));

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentDate]);

  return currentDate;
};

// --- Helpers ---

export const getNextRefreshDelay = (currentDate: Date): number => {
  const boundary = new Date(currentDate);
  const hour = currentDate.getHours();

  if (hour < AFTERNOON_HOUR) {
    boundary.setHours(AFTERNOON_HOUR, 0, 0, 0);
  } else if (hour < EVENING_HOUR) {
    boundary.setHours(EVENING_HOUR, 0, 0, 0);
  } else {
    boundary.setDate(boundary.getDate() + 1);
    boundary.setHours(0, 0, 0, 0);
  }

  return Math.max(boundary.getTime() - currentDate.getTime(), MINIMUM_DELAY_MS);
};
