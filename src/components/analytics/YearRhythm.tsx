import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import CartesianChart from '@/components/charts/CartesianChart';
import type { ChartPoint, Series } from '@/components/charts/chartTypes';
import { buildBaseline } from '@/lib/baseline';
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils';

type MonthPoint = {
  month: string;
  fullMonth: string;
  amount: number;
};

type Props = {
  months: MonthPoint[];
  currency: string;
};

const SERIES: Series[] = [
  { kind: 'area', key: 'deviation', label: 'rhythm', color: '--primary' },
];

// A year as a wave around your own typical month rather than bars against a
// budget. The centre line is not a target you can fail — it is simply where
// you usually sit, so a month above it is heavier than usual and one below is
// lighter, and neither is a verdict.
//
// This is the chart the app is recognisable by, which is why it plots a
// personal baseline: a bar chart against a budget number is what every other
// budgeting app already looks like.
const YearRhythm = ({ months, currency }: Props) => {
  const { t } = useTranslation();

  const model = useMemo(() => buildRhythm(months), [months]);

  // Fewer than a few months with real spending is not a rhythm, it is a
  // couple of points — and a wave drawn through them would imply a pattern
  // that has not happened yet.
  if (model === null) {
    return null;
  }

  return (
    <section className="surface-card p-4" aria-labelledby="year-rhythm-title">
      <h2 id="year-rhythm-title" className="type-heading">
        {t('analytics.rhythm.title')}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {t('analytics.rhythm.subtitle', {
          amount: formatCurrency(model.typical, currency),
        })}
      </p>
      <div className="mt-3">
        <CartesianChart
          data={model.points as unknown as ChartPoint[]}
          xKey="month"
          series={SERIES}
          height={200}
          allowNegative
          formatY={(value) => formatCurrencyCompact(value, currency)}
          reference={{
            value: 0,
            color: '--muted-foreground',
            label: t('analytics.rhythm.usual'),
          }}
          renderTooltip={(point) => renderTooltip(point, currency, t)}
          ariaLabel={t('analytics.rhythm.summary', {
            amount: formatCurrency(model.typical, currency),
            heavier: model.heavier,
            lighter: model.lighter,
          })}
        />
      </div>
    </section>
  );
};

export default YearRhythm;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const MIN_ACTIVE_MONTHS = 4;

const buildRhythm = (months: MonthPoint[]) => {
  const active = months.filter((month) => month.amount > 0);
  if (active.length < MIN_ACTIVE_MONTHS) {
    return null;
  }

  // Months with nothing in them are left out of the baseline: a year viewed
  // in March has nine empty months, and counting them would drag the typical
  // month towards zero and put every real month far "above usual".
  const typical = buildBaseline(active.map((month) => month.amount)).median;

  return {
    typical,
    heavier: active.filter((month) => month.amount > typical).length,
    lighter: active.filter((month) => month.amount < typical).length,
    points: active.map((month) => ({
      month: month.month,
      fullMonth: month.fullMonth,
      amount: month.amount,
      deviation: month.amount - typical,
    })),
  };
};

const renderTooltip = (point: ChartPoint, currency: string, t: TFunc) => {
  const deviation = Number(point.deviation ?? 0);

  return (
    <>
      <p className="font-medium text-foreground">{String(point.fullMonth)}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">
        {formatCurrency(Number(point.amount ?? 0), currency)}
      </p>
      <p className="mt-0.5 text-muted-foreground">
        {t(deviationKey(deviation), {
          amount: formatCurrency(Math.abs(deviation), currency),
        })}
      </p>
    </>
  );
};

// Within a twentieth of typical is noise, not a pattern worth naming.
const deviationKey = (deviation: number): string => {
  if (Math.abs(deviation) < 1) {
    return 'analytics.rhythm.level';
  }
  if (deviation > 0) {
    return 'analytics.rhythm.heavier';
  }

  return 'analytics.rhythm.lighter';
};
