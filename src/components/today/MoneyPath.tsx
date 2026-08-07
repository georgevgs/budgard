import { useTranslation } from 'react-i18next';
import type {
  MoneyPathPoint,
  TodayStatus,
} from '@/hooks/today/useTodayGuidance';

type Props = {
  points: MoneyPathPoint[];
  daysInMonth: number;
  today: number;
  status: TodayStatus;
  everydayProgress: number;
};

const MoneyPath = ({
  points,
  daysInMonth,
  today,
  status,
  everydayProgress,
}: Props) => {
  const { t } = useTranslation();
  const actualPath = buildActualPath(points, daysInMonth);
  const todayX = scaleX(today, daysInMonth);
  const todayY = scaleY(everydayProgress);

  return (
    <div
      className="money-path relative mt-6 overflow-hidden rounded-[1.4rem] border border-white/35 bg-black/5 px-3 pt-3 pb-2 dark:bg-white/5"
      role="img"
      aria-label={t('today.path.ariaLabel', {
        day: today,
        percent: Math.round(everydayProgress),
      })}
    >
      <svg viewBox="0 0 320 112" className="h-28 w-full" aria-hidden="true">
        <path
          d="M 8 94 L 312 6 L 312 42 L 8 112 Z"
          className="fill-white/28 dark:fill-white/8"
        />
        <path
          d="M 8 103 L 312 24"
          className="stroke-white/40 dark:stroke-white/12"
          strokeWidth="1"
          strokeDasharray="4 6"
          fill="none"
        />
        {renderActualPath(actualPath)}
        {renderTodayMarker(todayX, todayY, status)}
      </svg>
      <div
        className="flex items-center justify-between px-1 text-[11px] font-semibold opacity-60"
        aria-hidden="true"
      >
        <span>{t('today.path.monthStart')}</span>
        <span>{t('today.path.today')}</span>
        <span>{t('today.path.monthEnd')}</span>
      </div>
      {/* Reads as the chart's caption, not a second opinion. aria-hidden
          because the wrapper's aria-label already states the same figures —
          announcing them twice is noise. */}
      <p
        className="mt-1.5 px-1 pb-0.5 text-xs font-semibold opacity-75"
        aria-hidden="true"
      >
        {t('today.paceSummary', {
          percent: Math.round(everydayProgress),
          day: today,
          days: daysInMonth,
        })}
      </p>
    </div>
  );
};

export default MoneyPath;

// --- Helpers ---

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 112;
const PADDING = 8;

const scaleX = (day: number, daysInMonth: number): number => {
  if (daysInMonth <= 0) {
    return PADDING;
  }

  return PADDING + (day / daysInMonth) * (VIEW_WIDTH - PADDING * 2);
};

const scaleY = (percent: number): number => {
  const bounded = Math.min(Math.max(percent, 0), 115);

  return VIEW_HEIGHT - PADDING - (bounded / 115) * (VIEW_HEIGHT - PADDING * 2);
};

type ScaledPoint = {
  x: number;
  y: number;
};

// A polyline put a hard vertex on every single day, which read as a chart
// judging the month. The same data through a Catmull-Rom spline reads as one
// continuous movement — the whole point of the hero's calmer tone.
const buildActualPath = (
  points: MoneyPathPoint[],
  daysInMonth: number,
): string => {
  const scaled = points.map((point) => ({
    x: scaleX(point.day, daysInMonth),
    y: scaleY(point.budgetPercent),
  }));

  if (scaled.length < 2) {
    return '';
  }

  let path = `M ${round(scaled[0].x)} ${round(scaled[0].y)}`;
  for (let index = 0; index < scaled.length - 1; index += 1) {
    const previous = scaled[Math.max(index - 1, 0)];
    const start = scaled[index];
    const end = scaled[index + 1];
    const next = scaled[Math.min(index + 2, scaled.length - 1)];
    const control1 = buildControlPoint(
      start.x + (end.x - previous.x) / 6,
      start.y + (end.y - previous.y) / 6,
      start.y,
      end.y,
    );
    const control2 = buildControlPoint(
      end.x - (next.x - start.x) / 6,
      end.y - (next.y - start.y) / 6,
      start.y,
      end.y,
    );

    path += ` C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${round(end.x)} ${round(end.y)}`;
  }

  return path;
};

// Cumulative spending only ever goes up, so an unclamped spline is free to
// overshoot below a segment and draw a dip the user never had — the curve would
// claim money came back. Holding each control point inside its own segment's
// range keeps the curve monotonic while staying smooth.
const buildControlPoint = (
  x: number,
  y: number,
  segmentStartY: number,
  segmentEndY: number,
): ScaledPoint => ({
  x: round(x),
  y: round(clampToSegment(y, segmentStartY, segmentEndY)),
});

const clampToSegment = (value: number, a: number, b: number): number => {
  const min = Math.min(a, b);
  const max = Math.max(a, b);

  return Math.min(Math.max(value, min), max);
};

const round = (value: number): number => Math.round(value * 100) / 100;

const renderActualPath = (path: string) => {
  if (path.length === 0) {
    return null;
  }

  return (
    <path
      d={path}
      pathLength="1"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="money-path-line opacity-85"
    />
  );
};

// The line is drawn in the hero's own ink rather than a status colour: the
// surface behind it already carries the state, and ink is the only stroke that
// stays legible across all three tones in both themes.
const renderTodayMarker = (x: number, y: number, status: TodayStatus) => {
  if (status === 'noBudget') {
    return null;
  }

  return (
    <g>
      <circle cx={x} cy={y} r="9" className="fill-current opacity-15" />
      <circle cx={x} cy={y} r="5.5" className="fill-primary" />
      <circle cx={x} cy={y} r="2" className="fill-white" />
    </g>
  );
};
