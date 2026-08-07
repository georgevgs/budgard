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
  const actualPoints = buildActualPoints(points, daysInMonth);
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
          d="M 8 96 L 312 10 L 312 38 L 8 110 Z"
          className="fill-white/28 dark:fill-white/8"
        />
        <path
          d="M 8 103 L 312 24"
          className="stroke-white/65 dark:stroke-white/18"
          strokeWidth="1"
          strokeDasharray="4 6"
          fill="none"
        />
        {renderActualPath(actualPoints)}
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

const buildActualPoints = (
  points: MoneyPathPoint[],
  daysInMonth: number,
): string =>
  points
    .map(
      (point) =>
        `${scaleX(point.day, daysInMonth)},${scaleY(point.budgetPercent)}`,
    )
    .join(' ');

const renderActualPath = (points: string) => {
  if (points.length === 0) {
    return null;
  }

  return (
    <polyline
      points={points}
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
