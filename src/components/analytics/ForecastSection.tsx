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
  const { safeToSpend, projection, noData } = useForecastData();

  if (noData) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl font-semibold">
        {t('analytics.forecast.title')}
      </h2>

      <div className="surface-card">
        <div className="p-5 space-y-4">
          {renderSafeToSpend(safeToSpend, defaultCurrency, t)}

          <div>
            <p className="text-sm font-medium mb-3">
              {t('analytics.forecast.chartTitle')}
            </p>
            <Suspense fallback={<div className="h-[288px]" aria-hidden />}>
              <ForecastChart
                data={projection}
                currencySymbol={currencySymbol}
                currency={defaultCurrency}
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
