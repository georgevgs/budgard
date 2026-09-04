import { useTranslation } from 'react-i18next';
import BentoTile from '@/components/bento/BentoTile';
import TileLabel from '@/components/bento/TileLabel';
import { cn } from '@/lib/utils';
import type { DailyPace, PaceDay } from '@/hooks/today/useDailyPace';

type Props = {
  pace: DailyPace;
};

// Seven days, one bar each, the ones that ran hot in the accent. Where the
// ring next to it answers "how much of the plan is gone", this answers the
// question that follows: "and was that steady, or was it one bad Saturday".
const MonthPaceTile = ({ pace }: Props) => {
  const { t } = useTranslation();

  return (
    <BentoTile
      to="/trends"
      ariaLabel={t('today.tile.monthPaceAria', {
        day: pace.dayOfMonth,
        days: pace.daysInMonth,
      })}
      className="flex flex-col justify-between p-4"
    >
      <TileLabel>{t('today.tiles.monthPace')}</TileLabel>
      <div
        className="mt-3 flex h-[4.6rem] items-end gap-[5px]"
        aria-hidden="true"
      >
        {pace.days.map((day) => renderBar(day, pace.peak))}
      </div>
      <p className="mt-3 text-[0.72rem] leading-snug text-muted-foreground">
        {t('today.tile.dayOfMonth', {
          day: pace.dayOfMonth,
          days: pace.daysInMonth,
        })}
      </p>
    </BentoTile>
  );
};

export default MonthPaceTile;

// --- Helpers ---

// A day with nothing spent still gets a stub, so seven days always read as
// seven days rather than as a gap in the data.
const MIN_HEIGHT = 8;

const renderBar = (day: PaceDay, peak: number) => {
  return (
    <span
      key={day.date}
      className={cn('flex-1 rounded-[4px]', getBarToneClassName(day))}
      style={{ height: `${getBarHeight(day.amount, peak)}%` }}
    />
  );
};

const getBarHeight = (amount: number, peak: number): number => {
  if (peak <= 0) {
    return MIN_HEIGHT;
  }

  return Math.max((amount / peak) * 100, MIN_HEIGHT);
};

const getBarToneClassName = (day: PaceDay): string => {
  if (day.isOverPace) {
    return 'bg-primary';
  }

  return 'bg-border/70';
};
