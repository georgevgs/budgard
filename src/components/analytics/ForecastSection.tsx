import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataConfig } from '@/contexts/DataContext';
import { useForecastData } from '@/hooks/analytics/useForecastData';
import { formatCurrency, cn } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

const ForecastChart = lazyWithRetry(
  () => import('@/components/analytics/ForecastChart'),
);

const ForecastSection = () => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const currencySymbol = getCurrencySymbol(defaultCurrency);
  const forecast = useForecastData();
  const { safeToSpend, projection, noData } = forecast;

  if (noData) return null;

  return (
    <div className="space-y-3">
      <h2 className="type-heading">{t('analytics.forecast.title')}</h2>

      <div className="surface-card">
        <div className="p-5 space-y-4">
          {renderSafeToSpend(safeToSpend, defaultCurrency, t)}
          {renderShortfall(forecast, defaultCurrency, t)}

          <div>
            <p className="text-sm font-medium mb-3">
              {t('analytics.forecast.chartTitle')}
            </p>
            <Suspense fallback={<div className="h-[288px]" aria-hidden />}>
              <ForecastChart
                data={projection}
                currencySymbol={currencySymbol}
                currency={defaultCurrency}
                hasBalance={forecast.openingBalance !== null}
              />
            </Suspense>
          </div>

          <p className="text-xs text-muted-foreground">
            {t('analytics.forecast.methodNote')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForecastSection;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

// The whole reason the balance is projected at all. A chart of monthly nets
// tells you the rate; this tells you the month it stops being survivable,
// which is the question people actually bring to a forecast.
//
// Framed as a heads-up rather than an alarm: it is a projection built on an
// average, months away, and entirely avoidable. Saying "you will run out"
// would overstate what the model knows.
const renderShortfall = (
  forecast: ReturnType<typeof useForecastData>,
  currency: string,
  t: TranslateFunction,
) => {
  if (forecast.openingBalance === null) {
    return renderNoBalanceHint(t);
  }
  if (!forecast.shortfall) {
    return null;
  }

  return (
    <p className="rounded-xl bg-warning/14 px-4 py-3 text-sm font-medium text-warning-ink">
      {t('analytics.forecast.shortfall', {
        month: forecast.shortfall.label,
        amount: formatCurrency(
          Math.abs(forecast.shortfall.projectedBalance ?? 0),
          currency,
        ),
      })}
    </p>
  );
};

// Without a cash or bank account there is no balance to project from, and the
// chart shows flows alone. Say why, and where to fix it — an unexplained
// missing line reads as a bug.
const renderNoBalanceHint = (t: TranslateFunction) => (
  <p className="text-xs leading-relaxed text-muted-foreground">
    {t('analytics.forecast.noBalance')}
  </p>
);

// Only rendered when a monthly budget exists (computeSafeToSpend returns
// null otherwise). Negative values stay visible in destructive red — an
// honest "you are over" beats a clamped zero.
const renderSafeToSpend = (
  safeToSpend: number | null,
  currency: string,
  t: TranslateFunction,
) => {
  if (safeToSpend === null) return null;

  return (
    <div className="pb-4 border-b border-border/40">
      <p className="text-sm text-muted-foreground">
        {t('analytics.forecast.safeToSpend')}
      </p>
      <p
        className={cn(
          'text-3xl font-bold tabular-nums tracking-tight',
          getSafeToSpendClass(safeToSpend),
        )}
      >
        {formatCurrency(safeToSpend, currency)}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {t('analytics.forecast.safeToSpendHint')}
      </p>
    </div>
  );
};

const getSafeToSpendClass = (value: number): string => {
  if (value >= 0) {
    return 'text-income-ink';
  }

  return 'text-destructive-ink';
};
