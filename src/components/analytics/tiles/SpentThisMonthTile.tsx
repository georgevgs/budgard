import { useTranslation } from 'react-i18next';
import BentoTile from '@/components/bento/BentoTile';
import TileLabel from '@/components/bento/TileLabel';
import { useDataConfig } from '@/contexts/DataContext';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { buildSparkline } from '@/lib/sparkline';
import { cn, formatCurrency, formatPercent } from '@/lib/utils';
import type { MonthComparison } from '@/hooks/analytics/useAnalyticsData';

type RhythmMonth = {
  month: string;
  amount: number;
};

type Props = {
  monthComparison: MonthComparison;
  /** Rolling months, oldest first. The last six are charted. */
  rhythmMonths: RhythmMonth[];
};

const WINDOW = 6;
const VIEW = { width: 330, height: 120 };

// The screen's headline: what this month has cost, how that compares, and the
// shape of the months behind it. One tile because those are one thought — the
// figure means nothing without the curve and the curve means nothing unlabelled.
const SpentThisMonthTile = ({ monthComparison, rhythmMonths }: Props) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const animated = useAnimatedNumber(monthComparison.thisMonthAmount);
  const months = rhythmMonths.slice(-WINDOW);
  const path = buildSparkline(
    months.map((month) => month.amount),
    VIEW,
  );

  return (
    <BentoTile wide className="rounded-[1.875rem] px-4.5 pt-5 pb-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <TileLabel>{monthComparison.thisMonthLabel}</TileLabel>
          <p className="mt-2.5 type-figure-lg">
            {formatCurrency(animated, defaultCurrency)}
          </p>
        </div>
        {renderChangeChip(monthComparison, t)}
      </div>
      {renderChart(path)}
      {renderAxis(months)}
    </BentoTile>
  );
};

export default SpentThisMonthTile;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

// Proportional, not stretched. `preserveAspectRatio="none"` would fit the
// curve to any width for free, but it scales x and y independently — the end
// marker would arrive as an ellipse on anything wider than a phone, and the
// curve's slope would lie about how steep the month actually was.
const renderChart = (path: ReturnType<typeof buildSparkline>) => {
  if (path === null) {
    return null;
  }

  return (
    <svg
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      className="mt-3 block w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor="hsl(var(--primary))"
            stopOpacity="0.22"
          />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path.area} fill="url(#trend-area)" />
      <path
        d={path.line}
        fill="none"
        className="stroke-primary"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* "You are here". Without it the curve reads as running off the tile
          rather than arriving at this month. */}
      <circle
        cx={path.end.x}
        cy={path.end.y}
        r="4.5"
        className="fill-primary"
      />
    </svg>
  );
};

// The current month is the one the figure above belongs to, so it is the one
// month named in the accent — the axis is a legend for the curve, and the
// curve's right-hand end is where the eye already is.
const renderAxis = (months: RhythmMonth[]) => {
  return (
    <div
      aria-hidden="true"
      className="mt-1 flex justify-between text-[0.6875rem] font-medium uppercase leading-none tracking-[0.1em] text-muted-foreground"
    >
      {months.map((month, index) => (
        <span
          key={month.month}
          className={getAxisToneClassName(index, months.length)}
        >
          {month.month}
        </span>
      ))}
    </div>
  );
};

const getAxisToneClassName = (index: number, total: number): string => {
  if (index === total - 1) {
    return 'text-primary-ink';
  }

  return '';
};

const renderChangeChip = (comparison: MonthComparison, t: TFunc) => {
  if (comparison.percentChange === null) {
    return null;
  }

  const percent = formatPercent(Math.abs(comparison.percentChange), 1);

  if (comparison.delta > 0) {
    return renderChip(`+${percent}`, 'bg-destructive/10 text-destructive-ink');
  }
  if (comparison.delta < 0) {
    return renderChip(`−${percent}`, 'bg-income/10 text-income-ink');
  }

  return renderChip(
    t('analytics.sameAsLastMonth'),
    'bg-muted text-muted-foreground',
  );
};

const renderChip = (text: string, tone: string) => (
  <span
    className={cn(
      'shrink-0 rounded-full px-2.5 py-1.5 text-[0.72rem] font-semibold leading-none tabular-nums',
      tone,
    )}
  >
    {text}
  </span>
);
