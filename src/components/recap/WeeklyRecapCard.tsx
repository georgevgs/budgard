import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import type { Locale } from 'date-fns';
import CalendarRange from 'lucide-react/dist/esm/icons/calendar-range';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import X from 'lucide-react/dist/esm/icons/x';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDataConfig } from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import { useWeeklyRecap } from '@/hooks/useWeeklyRecap';
import { formatCurrency } from '@/lib/utils';
import type { WeeklyAnomaly } from '@/lib/weeklyAnomalies';

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const WeeklyRecapCard = () => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const dateLocale = useDateLocale();
  const { recap, isDismissed, dismiss } = useWeeklyRecap();

  if (isDismissed) return null;
  if (!recap) return null;
  if (recap.anomalies.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        {renderHeader(
          recap.windowStart,
          recap.windowEnd,
          dismiss,
          dateLocale,
          t,
        )}
        <p className="text-2xl font-bold tabular-nums tracking-tight">
          {formatCurrency(recap.weekTotal, defaultCurrency)}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {t('weeklyRecap.acrossN', { count: recap.weekCount })}
          </span>
        </p>
        {renderTotalComparison(recap.totalRatio, t)}
        {renderAnomalies(recap.anomalies, defaultCurrency, t)}
      </CardContent>
    </Card>
  );
};

export default WeeklyRecapCard;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const renderHeader = (
  startStr: string,
  endStr: string,
  onDismiss: () => void,
  dateLocale: Locale,
  t: TFunc,
) => {
  const startLabel = format(parseISO(startStr), 'd LLL', { locale: dateLocale });
  const endLabel = format(parseISO(endStr), 'd LLL', { locale: dateLocale });

  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <CalendarRange className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight">
          {t('weeklyRecap.title')}
        </h3>
        <span className="text-xs text-muted-foreground">
          {startLabel} – {endLabel}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDismiss}
        className="h-7 w-7 -mr-1.5"
        aria-label={t('weeklyRecap.dismissAria')}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

const renderTotalComparison = (ratio: number | null, t: TFunc) => {
  if (ratio === null) return null;

  const percent = Math.round((ratio - 1) * 100);
  if (Math.abs(percent) < 5) {
    return (
      <p className="text-xs text-muted-foreground mt-1">
        {t('weeklyRecap.aboutNormal')}
      </p>
    );
  }

  if (percent > 0) {
    return (
      <p className="text-xs text-muted-foreground mt-1">
        {t('weeklyRecap.aboveAvg', { percent })}
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground mt-1">
      {t('weeklyRecap.belowAvg', { percent: Math.abs(percent) })}
    </p>
  );
};

const renderAnomalies = (
  anomalies: WeeklyAnomaly[],
  currency: string,
  t: TFunc,
) => {
  if (anomalies.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {anomalies.map((a) => renderAnomalyRow(a, currency, t))}
    </div>
  );
};

const renderAnomalyRow = (
  anomaly: WeeklyAnomaly,
  currency: string,
  t: TFunc,
) => {
  const multiple = anomaly.ratio.toFixed(1).replace(/\.0$/, '');
  const Icon = anomaly.direction === 'up' ? TrendingUp : TrendingDown;
  const colorClass =
    anomaly.direction === 'up' ? 'text-amber-500' : 'text-income';

  return (
    <div key={anomaly.categoryId} className="flex items-start gap-3 text-sm">
      <div
        className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 bg-muted ${colorClass}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium truncate">{anomaly.categoryName}</span>
          <span className="tabular-nums text-xs text-muted-foreground shrink-0">
            {formatCurrency(anomaly.thisWeekAmount, currency)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-snug">
          {renderAnomalyText(anomaly.direction, multiple, t)}
          <span className="mx-1">·</span>
          {t('weeklyRecap.usualWeekly', {
            amount: formatCurrency(anomaly.baselineWeeklyAverage, currency),
          })}
        </p>
      </div>
    </div>
  );
};

const renderAnomalyText = (
  direction: WeeklyAnomaly['direction'],
  multiple: string,
  t: TFunc,
): string => {
  if (direction === 'up') return t('weeklyRecap.upMultiple', { multiple });

  return t('weeklyRecap.downMultiple', { multiple });
};
