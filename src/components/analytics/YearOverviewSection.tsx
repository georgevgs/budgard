import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDataConfig } from '@/contexts/DataContext';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { formatCurrency } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

// Lazy-load the chart so the Recharts chunk doesn't gate the rest of the
// view's render. The placeholder reserves the same vertical space (~280px)
// to avoid layout shift when the chunk resolves.
const MonthlyTrendChart = lazyWithRetry(
  () => import('@/components/analytics/MonthlyTrendChart'),
);

type MonthlyDatum = {
  month: string;
  fullMonth: string;
  amount: number;
};

type Props = {
  selectedYear: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
  monthlyData: MonthlyDatum[];
  yAxisMax: number | undefined;
  totalSpent: number;
  monthlyAverage: number;
  monthsElapsed: number;
  onMonthClick: (index: number) => void;
};

const YearOverviewSection = ({
  selectedYear,
  availableYears,
  onYearChange,
  monthlyData,
  yAxisMax,
  totalSpent,
  monthlyAverage,
  monthsElapsed,
  onMonthClick,
}: Props) => {
  const { t } = useTranslation();
  const { monthlyBudget, defaultCurrency } = useDataConfig();
  const animatedYearTotal = useAnimatedNumber(totalSpent);
  const currencySymbol = getCurrencySymbol(defaultCurrency);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-foreground">
          {t('analytics.yearOverview')}
        </h3>
        <Select
          value={selectedYear.toString()}
          onValueChange={(value) => onYearChange(parseInt(value))}
        >
          <SelectTrigger className="w-[110px] h-8">
            <SelectValue placeholder={t('analytics.selectYear')} />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {renderYearSummary(
        animatedYearTotal,
        monthlyAverage,
        monthsElapsed,
        t,
        defaultCurrency,
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <div className="w-full">
            <Suspense fallback={<div className="h-[280px]" aria-hidden />}>
              <MonthlyTrendChart
                data={monthlyData}
                monthlyBudget={monthlyBudget}
                defaultCurrency={defaultCurrency}
                currencySymbol={currencySymbol}
                yAxisMax={yAxisMax}
                onMonthClick={onMonthClick}
              />
            </Suspense>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default YearOverviewSection;

// ─── Helper render functions ──────────────────────────────────────────────────

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderYearSummary = (
  totalSpent: number,
  monthlyAverage: number,
  monthsElapsed: number,
  t: TFunc,
  currency: string,
) => {
  if (monthsElapsed === 0 || totalSpent === 0) return null;

  return (
    <p className="text-sm text-muted-foreground -mt-1">
      <span className="font-semibold tabular-nums text-foreground">
        {formatCurrency(totalSpent, currency)}
      </span>
      <span className="mx-2">·</span>
      <span>
        {t('analytics.avgPerMonth', {
          amount: formatCurrency(monthlyAverage, currency),
        })}
      </span>
    </p>
  );
};
