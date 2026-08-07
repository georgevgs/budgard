import { cn } from '@/lib/utils';
import type { DayOutcome, RhythmDay } from '@/hooks/today/useSavingsRhythm';

type Props = {
  days: RhythmDay[];
};

// aria-hidden, not role="img": the sentence rendered directly beneath these
// dots already states the same count, and labelling both made a screen reader
// announce it twice in a row.
const RhythmDots = ({ days }: Props) => (
  <div
    className="grid grid-cols-[repeat(15,minmax(0,1fr))] justify-items-center gap-y-2.5"
    aria-hidden="true"
  >
    {days.map(renderDot)}
  </div>
);

export default RhythmDots;

// --- Helpers ---

const STAGGER_STEP_MS = 12;
const STAGGER_CAP = 20;

const renderDot = (day: RhythmDay, index: number) => (
  <span
    key={day.key}
    className={cn(
      'rhythm-dot h-2 w-2 rounded-full',
      getOutcomeTone(day.outcome),
      getTodayClass(day.isToday),
    )}
    style={{
      animationDelay: `${Math.min(index, STAGGER_CAP) * STAGGER_STEP_MS}ms`,
    }}
  />
);

// A day that ran over is the same dot at lower volume — never red, never an
// outline. The ramp reads as brightness, which is why a claimed no-spend day
// can sit at the top of it as the brightest thing in the row.
const getOutcomeTone = (outcome: DayOutcome): string => {
  if (outcome === 'noSpend') {
    return 'rhythm-dot-best bg-primary';
  }
  if (outcome === 'under') {
    return 'bg-primary/70';
  }
  if (outcome === 'over') {
    return 'bg-foreground/25';
  }

  return 'bg-foreground/10';
};

const getTodayClass = (isToday: boolean): string => {
  if (isToday) {
    return 'rhythm-dot-today';
  }

  return '';
};
