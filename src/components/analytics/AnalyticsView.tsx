import { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { format, parseISO, getYear } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import Minus from 'lucide-react/dist/esm/icons/minus';
import { Card, CardContent } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AnalyticsLoadingState from '@/components/analytics/AnalyticsLoading';
import SpendingInsights from '@/components/analytics/SpendingInsights';
import CategorySparkline from '@/components/analytics/CategorySparkline';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/utils';

const Chart = lazy(() => import('react-apexcharts'));

const AnalyticsView = () => {
  const { expenses, categories, monthlyBudget, isLoading } = useData();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'el' ? el : enUS;

  const availableYears = useMemo(() => {
    const years = new Set(expenses.map((e) => getYear(parseISO(e.date))));
    return Array.from(years).sort().reverse();
  }, [expenses]);

  const [selectedYear, setSelectedYear] = useState(
    () => availableYears[0] || new Date().getFullYear(),
  );

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const yearExpenses = useMemo(() => {
    return expenses.filter((e) => getYear(parseISO(e.date)) === selectedYear);
  }, [expenses, selectedYear]);

  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = (i + 1).toString().padStart(2, '0');
      return `${selectedYear}-${month}`;
    });

    return months.map((month) => {
      const monthExpenses = yearExpenses.filter(
        (e) => format(parseISO(e.date), 'yyyy-MM') === month,
      );
      return {
        month: format(parseISO(`${month}-01`), 'LLL', { locale: dateLocale }),
        fullMonth: format(parseISO(`${month}-01`), 'LLLL', {
          locale: dateLocale,
        }),
        amount: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
      };
    });
  }, [yearExpenses, selectedYear, dateLocale]);

  const monthComparison = useMemo(() => {
    const now = new Date();
    const thisMonthKey = format(now, 'yyyy-MM');
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = format(lastMonthDate, 'yyyy-MM');

    const thisMonthAmount = expenses
      .filter((e) => format(parseISO(e.date), 'yyyy-MM') === thisMonthKey)
      .reduce((sum, e) => sum + e.amount, 0);

    const lastMonthAmount = expenses
      .filter((e) => format(parseISO(e.date), 'yyyy-MM') === lastMonthKey)
      .reduce((sum, e) => sum + e.amount, 0);

    const delta = thisMonthAmount - lastMonthAmount;
    const percentChange =
      lastMonthAmount > 0 ? (delta / lastMonthAmount) * 100 : null;

    return {
      thisMonthLabel: format(now, 'LLLL yyyy', { locale: dateLocale }),
      lastMonthLabel: format(lastMonthDate, 'LLLL yyyy', {
        locale: dateLocale,
      }),
      thisMonthAmount,
      lastMonthAmount,
      delta,
      percentChange,
    };
  }, [expenses, dateLocale]);

  const yearlyStats = useMemo(() => {
    const totalSpent = yearExpenses.reduce((sum, e) => sum + e.amount, 0);
    const monthsWithExpenses = monthlyData.filter((m) => m.amount > 0).length;
    const monthlyAverage =
      monthsWithExpenses > 0 ? totalSpent / monthsWithExpenses : 0;

    const categoryBreakdown = categories
      .map((cat) => {
        const catExpenses = yearExpenses.filter(
          (e) => e.category_id === cat.id,
        );
        const amount = catExpenses.reduce((sum, e) => sum + e.amount, 0);
        const monthlyAmounts = Array.from({ length: 12 }, (_, i) => {
          const month = (i + 1).toString().padStart(2, '0');
          const key = `${selectedYear}-${month}`;
          return catExpenses
            .filter((e) => format(parseISO(e.date), 'yyyy-MM') === key)
            .reduce((sum, e) => sum + e.amount, 0);
        });
        return { id: cat.id, name: cat.name, color: cat.color, amount, monthlyAmounts };
      })
      .filter((cat) => cat.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return { totalSpent, monthlyAverage, categoryBreakdown, activeMonths: monthsWithExpenses };
  }, [yearExpenses, categories, monthlyData, selectedYear]);

  const budgetUsedPercent = useMemo(() => {
    if (!monthlyBudget || monthlyBudget === 0) return null;
    return Math.min(
      (monthComparison.thisMonthAmount / monthlyBudget) * 100,
      100,
    );
  }, [monthComparison.thisMonthAmount, monthlyBudget]);

  const chartOptions = useMemo(
    () => ({
      chart: {
        type: 'area' as const,
        toolbar: { show: false },
        fontFamily: 'inherit',
        background: 'transparent',
        animations: { enabled: true },
      },
      annotations: monthlyBudget
        ? {
            yaxis: [
              {
                y: monthlyBudget,
                borderColor: '#f59e0b',
                strokeDashArray: 5,
                label: {
                  text: t('analytics.budgetLabel', { amount: monthlyBudget }),
                  position: 'right',
                  style: {
                    color: '#fff',
                    background: '#f59e0b',
                    fontSize: '11px',
                    padding: { top: 2, bottom: 2, left: 4, right: 4 },
                  },
                },
              },
            ],
          }
        : {},
      grid: {
        borderColor: 'hsl(var(--border) / 0.2)',
        strokeDashArray: 4,
      },
      stroke: { curve: 'smooth' as const, width: 2 },
      fill: {
        type: 'gradient' as const,
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.2,
          stops: [0, 90, 100],
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: monthlyData.map((d) => d.month),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: 'hsl(var(--muted-foreground))' } },
      },
      yaxis: {
        min: 0,
        max: monthlyBudget
          ? Math.max(
              monthlyBudget * 1.15,
              Math.max(...monthlyData.map((d) => d.amount), 0) * 1.15,
            )
          : undefined,
        labels: {
          formatter: (val: number) => `${Math.round(val)} €`,
          style: { colors: 'hsl(var(--muted-foreground))' },
        },
      },
      tooltip: {
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
        y: { formatter: (val: number) => `${val.toFixed(2)} €` },
      },
      colors: ['hsl(var(--primary))'],
    }),
    [monthlyData, monthlyBudget, t],
  );

  const chartSeries = useMemo(
    () => [
      {
        name: t('analytics.monthlySpending'),
        data: monthlyData.map((d) => d.amount),
      },
    ],
    [monthlyData, t],
  );

  if (isLoading) {
    return <AnalyticsLoadingState />;
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 pt-4 pb-4 space-y-6">
      {/* Month snapshot */}
      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          {monthComparison.thisMonthLabel}
        </p>
        <div className="flex items-baseline gap-3 flex-wrap">
          <p className="text-3xl font-bold tabular-nums">
            {formatCurrency(monthComparison.thisMonthAmount)}
          </p>
          {renderMonthChangeBadge(
            monthComparison.percentChange,
            monthComparison.delta,
            t,
          )}
        </div>
        {renderLastMonthContext(
          monthComparison.lastMonthAmount,
          monthComparison.lastMonthLabel,
          t,
        )}
        {renderBudgetProgress(budgetUsedPercent, monthlyBudget, t)}
      </div>

      {/* Spending insights */}
      <SpendingInsights
        expenses={expenses}
        monthlyBudget={monthlyBudget}
        monthComparison={monthComparison}
        monthlyData={monthlyData}
        categories={categories}
        dateLocale={dateLocale}
      />

      {/* Year overview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[130px]">
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
          {renderYearSummary(
            yearlyStats.totalSpent,
            yearlyStats.monthlyAverage,
            yearlyStats.activeMonths,
            t,
          )}
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="h-[280px] w-full">
              <Suspense
                fallback={
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                }
              >
                <Chart
                  options={chartOptions}
                  series={chartSeries}
                  type="area"
                  height="100%"
                />
              </Suspense>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
          {t('analytics.categoryTrends')}
        </p>
        {renderCategoryBreakdown(
          yearlyStats.categoryBreakdown,
          yearlyStats.totalSpent,
          selectedYear,
          t,
        )}
      </div>
    </div>
  );
};

export default AnalyticsView;

// ─── Helper render functions ──────────────────────────────────────────────────

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderMonthChangeBadge = (
  percentChange: number | null,
  delta: number,
  t: TFunc,
) => {
  if (percentChange === null) return null;

  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 rounded-full px-2.5 py-0.5">
        <TrendingUp className="h-3 w-3" />
        {t('analytics.vsLastMonthUp', { percent: percentChange.toFixed(1) })}
      </span>
    );
  }

  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-500/10 rounded-full px-2.5 py-0.5">
        <TrendingDown className="h-3 w-3" />
        {t('analytics.vsLastMonthDown', {
          percent: Math.abs(percentChange).toFixed(1),
        })}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">
      <Minus className="h-3 w-3" />
      {t('analytics.sameAsLastMonth')}
    </span>
  );
};

const renderLastMonthContext = (
  lastMonthAmount: number,
  lastMonthLabel: string,
  t: TFunc,
) => {
  if (lastMonthAmount === 0) return null;

  return (
    <p className="text-xs text-muted-foreground mt-1.5">
      {t('analytics.vsLastMonthContext', {
        amount: formatCurrency(lastMonthAmount),
        month: lastMonthLabel,
      })}
    </p>
  );
};

const renderBudgetProgress = (
  budgetUsedPercent: number | null,
  monthlyBudget: number | null,
  t: TFunc,
) => {
  if (budgetUsedPercent === null || monthlyBudget === null) return null;

  let barClass = 'bg-primary';
  if (budgetUsedPercent > 90) {
    barClass = 'bg-destructive';
  } else if (budgetUsedPercent > 75) {
    barClass = 'bg-amber-500';
  }

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
        <span>
          {t('analytics.budgetUsed', {
            percent: Math.round(budgetUsedPercent),
          })}
        </span>
        <span>{formatCurrency(monthlyBudget)}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barClass}`}
          style={{ width: `${budgetUsedPercent}%` }}
        />
      </div>
    </div>
  );
};

const renderYearSummary = (
  totalSpent: number,
  monthlyAverage: number,
  activeMonths: number,
  t: TFunc,
) => {
  if (activeMonths === 0) return null;

  return (
    <div className="text-right">
      <span className="text-sm font-semibold tabular-nums">
        {formatCurrency(totalSpent)}
      </span>
      <span className="text-xs text-muted-foreground ml-2">
        {t('analytics.avgPerMonth', { amount: formatCurrency(monthlyAverage) })}
      </span>
    </div>
  );
};

type CategoryRow = {
  id: string;
  name: string;
  color: string;
  amount: number;
  monthlyAmounts: number[];
};

const renderCategoryBreakdown = (
  breakdown: CategoryRow[],
  totalSpent: number,
  selectedYear: number,
  t: TFunc,
) => {
  if (breakdown.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        {t('analytics.noCategorizedExpenses', { year: selectedYear })}
      </p>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 divide-y divide-border/50">
        {breakdown.map((cat) => {
          const pct = totalSpent > 0 ? (cat.amount / totalSpent) * 100 : 0;
          return (
            <div key={cat.id} className="flex items-center gap-4 px-5 py-3.5">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className="flex-1 text-sm font-medium truncate min-w-0">
                {cat.name}
              </span>
              <div className="shrink-0 w-16">
                <CategorySparkline
                  values={cat.monthlyAmounts}
                  color={cat.color}
                />
              </div>
              <span
                className="text-sm font-semibold tabular-nums shrink-0"
                style={{ color: cat.color }}
              >
                {formatCurrency(cat.amount)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0">
                {Math.round(pct)}%
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
