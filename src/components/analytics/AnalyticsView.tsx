import { useMemo, useState, useEffect, useCallback } from 'react';
import { format, parseISO, getYear } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import Minus from 'lucide-react/dist/esm/icons/minus';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { CategoricalChartFunc } from 'recharts/types/chart/types';
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
import { CategoryDrillDown } from '@/components/analytics/CategoryDrillDown';
import { MonthDrillDown } from '@/components/analytics/MonthDrillDown';
import MonthlyReportCard from '@/components/analytics/MonthlyReportCard';
import CashFlowSection from '@/components/analytics/CashFlowSection';
import AnnualExportCard from '@/components/analytics/AnnualExportCard';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

const BUDGET_LINE_COLOR = '#f59e0b'; // amber-500 — matches bg-amber-500 budget warning

const AnalyticsView = () => {
  const {
    expenses,
    expenseCategories: categories,
    monthlyBudget,
    defaultCurrency,
    isLoading,
  } = useData();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'el' ? el : enUS;
  const currencySymbol = getCurrencySymbol(defaultCurrency);

  const availableYears = useMemo(() => {
    const years = new Set(expenses.map((e) => getYear(parseISO(e.date))));
    years.add(new Date().getFullYear());

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
    // Single pass: bucket each expense by category and by month index.
    type Bucket = { total: number; monthly: number[] };
    const byCat = new Map<string, Bucket>();
    let totalSpent = 0;

    for (const e of yearExpenses) {
      totalSpent += e.amount;
      if (!e.category_id) continue;
      let slot = byCat.get(e.category_id);
      if (!slot) {
        slot = { total: 0, monthly: new Array(12).fill(0) };
        byCat.set(e.category_id, slot);
      }
      const monthIdx = parseISO(e.date).getMonth();
      slot.total += e.amount;
      slot.monthly[monthIdx] += e.amount;
    }

    const monthsWithExpenses = monthlyData.filter((m) => m.amount > 0).length;
    const monthlyAverage =
      monthsWithExpenses > 0 ? totalSpent / monthsWithExpenses : 0;

    const categoryBreakdown = categories
      .map((cat) => {
        const slot = byCat.get(cat.id);

        return {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          amount: slot?.total ?? 0,
          monthlyAmounts: slot?.monthly ?? new Array(12).fill(0),
        };
      })
      .filter((cat) => cat.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return {
      totalSpent,
      monthlyAverage,
      categoryBreakdown,
      activeMonths: monthsWithExpenses,
    };
  }, [yearExpenses, categories, monthlyData]);

  const animatedThisMonth = useAnimatedNumber(monthComparison.thisMonthAmount);
  const animatedYearTotal = useAnimatedNumber(yearlyStats.totalSpent);

  const budgetUsedPercent = useMemo(() => {
    if (!monthlyBudget || monthlyBudget === 0) return null;

    return (monthComparison.thisMonthAmount / monthlyBudget) * 100;
  }, [monthComparison.thisMonthAmount, monthlyBudget]);

  // ─── Report card state ──────────────────────────────────────────────────────

  const [isReportOpen, setIsReportOpen] = useState(false);

  const thisMonthExpensesByCategory = useMemo(() => {
    const thisMonthKey = format(new Date(), 'yyyy-MM');
    const thisMonthExpenses = expenses.filter(
      (e) => format(parseISO(e.date), 'yyyy-MM') === thisMonthKey,
    );
    const map = new Map<string, number>();
    for (const e of thisMonthExpenses) {
      if (!e.category_id) continue;
      map.set(e.category_id, (map.get(e.category_id) ?? 0) + e.amount);
    }

    return map;
  }, [expenses]);

  // ─── Drill-down state ────────────────────────────────────────────────────────

  const [drillDownCategory, setDrillDownCategory] =
    useState<CategoryRow | null>(null);
  const [drillDownMonthKey, setDrillDownMonthKey] = useState<string | null>(
    null,
  );

  const drillDownCategoryExpenses = useMemo(() => {
    if (!drillDownCategory) return [];

    return yearExpenses.filter((e) => e.category_id === drillDownCategory.id);
  }, [yearExpenses, drillDownCategory]);

  const handleCategoryClick = useCallback((cat: CategoryRow) => {
    setDrillDownCategory(cat);
  }, []);

  const handleCategoryDrillDownClose = useCallback(() => {
    setDrillDownCategory(null);
  }, []);

  const handleMonthDrillDownClose = useCallback(() => {
    setDrillDownMonthKey(null);
  }, []);

  const handleChartClick: CategoricalChartFunc = useCallback(
    (nextState) => {
      const index = nextState?.activeTooltipIndex;
      if (typeof index !== 'number' || index < 0) return;
      const month = (index + 1).toString().padStart(2, '0');
      setDrillDownMonthKey(`${selectedYear}-${month}`);
    },
    [selectedYear],
  );

  const yAxisMax = useMemo(() => {
    const maxAmount = Math.max(...monthlyData.map((d) => d.amount), 0);
    if (monthlyBudget) {
      return Math.max(monthlyBudget * 1.15, maxAmount * 1.15);
    }

    return undefined;
  }, [monthlyData, monthlyBudget]);

  if (isLoading) {
    return <AnalyticsLoadingState />;
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 pt-4 pb-4 space-y-6">
      {/* Month snapshot */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-1">
            <p className="text-sm text-muted-foreground">
              {monthComparison.thisMonthLabel}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 -mt-1 -mr-1 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                (e.currentTarget as HTMLElement).blur();
                setIsReportOpen(true);
              }}
            >
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {formatCurrency(animatedThisMonth, defaultCurrency)}
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
            defaultCurrency,
          )}
          {renderBudgetProgress(
            budgetUsedPercent,
            monthlyBudget,
            t,
            defaultCurrency,
          )}
        </CardContent>
      </Card>

      {/* Spending insights */}
      <SpendingInsights
        expenses={expenses}
        monthlyBudget={monthlyBudget}
        monthComparison={monthComparison}
        categories={categories}
        dateLocale={dateLocale}
        defaultCurrency={defaultCurrency}
      />

      {/* Year overview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-foreground">
            {t('analytics.yearOverview')}
          </h3>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
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
          yearlyStats.monthlyAverage,
          yearlyStats.activeMonths,
          t,
          defaultCurrency,
        )}

        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="w-full">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={monthlyData}
                  onClick={handleChartClick}
                  margin={{ top: 4, right: 4, bottom: 0, left: -12 }}
                >
                  <defs>
                    <linearGradient
                      id="areaGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.7}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 12,
                    }}
                    tickFormatter={(val: number) => `${Math.round(val)}${currencySymbol}`}
                    domain={[0, yAxisMax ?? 'auto']}
                  />
                  <Tooltip
                    content={<ChartTooltip currency={defaultCurrency} />}
                    cursor={{
                      stroke: 'hsl(var(--border))',
                      strokeDasharray: '4 4',
                    }}
                  />
                  {renderBudgetReferenceLine(monthlyBudget, t, defaultCurrency)}
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#areaGradient)"
                    dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                    activeDot={{
                      r: 6,
                      fill: 'hsl(var(--primary))',
                      strokeWidth: 0,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash flow (income vs expense, year view) */}
      <CashFlowSection selectedYear={selectedYear} />

      {/* Annual export (CSV download for tax/records) */}
      <AnnualExportCard selectedYear={selectedYear} />

      {/* Category breakdown */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">
          {t('analytics.categoryTrends')}
        </h3>
        {renderCategoryBreakdown(
          yearlyStats.categoryBreakdown,
          yearlyStats.totalSpent,
          selectedYear,
          t,
          handleCategoryClick,
          defaultCurrency,
        )}
      </div>

      {/* Drill-down dialogs */}
      {renderCategoryDrillDown(
        drillDownCategory,
        drillDownCategoryExpenses,
        handleCategoryDrillDownClose,
      )}
      {renderMonthDrillDown(
        drillDownMonthKey,
        yearExpenses,
        categories,
        handleMonthDrillDownClose,
      )}

      {/* Monthly report card */}
      <MonthlyReportCard
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        monthLabel={monthComparison.thisMonthLabel}
        totalSpent={monthComparison.thisMonthAmount}
        lastMonthAmount={monthComparison.lastMonthAmount}
        monthlyBudget={monthlyBudget}
        categories={categories}
        expensesByCategory={thisMonthExpensesByCategory}
      />
    </div>
  );
};

export default AnalyticsView;

// ─── Helper render functions ──────────────────────────────────────────────────

type TooltipPayloadEntry = {
  value: number;
  payload: { fullMonth: string };
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  currency?: string;
};

const ChartTooltip = ({ active, payload, currency = 'EUR' }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;

  const { value, payload: data } = payload[0];

  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground">{data.fullMonth}</p>
      <p className="text-sm font-semibold tabular-nums">
        {formatCurrency(value, currency)}
      </p>
    </div>
  );
};

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
      <span className="inline-flex items-center gap-1 text-xs font-medium text-income bg-income/10 rounded-full px-2.5 py-0.5">
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
  currency: string,
) => {
  if (lastMonthAmount === 0) return null;

  return (
    <p className="text-xs text-muted-foreground mt-1.5">
      {t('analytics.vsLastMonthContext', {
        amount: formatCurrency(lastMonthAmount, currency),
        month: lastMonthLabel,
      })}
    </p>
  );
};

const renderBudgetProgress = (
  budgetUsedPercent: number | null,
  monthlyBudget: number | null,
  t: TFunc,
  currency: string,
) => {
  if (budgetUsedPercent === null || monthlyBudget === null) return null;

  const barWidth = Math.min(budgetUsedPercent, 100);

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
        <span>{formatCurrency(monthlyBudget, currency)}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barClass}`}
          style={{ width: `${barWidth}%` }}
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
  currency: string,
) => {
  if (activeMonths === 0) return null;

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

const renderBudgetReferenceLine = (
  monthlyBudget: number | null,
  t: TFunc,
  currency: string,
) => {
  if (!monthlyBudget) return null;

  return (
    <ReferenceLine
      y={monthlyBudget}
      stroke={BUDGET_LINE_COLOR}
      strokeDasharray="5 5"
      label={{
        value: t('analytics.budgetLabel', { amount: formatCurrency(monthlyBudget, currency) }),
        position: 'right',
        fill: BUDGET_LINE_COLOR,
        fontSize: 11,
      }}
    />
  );
};

type CategoryRow = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  amount: number;
  monthlyAmounts: number[];
};

const renderCategoryBreakdown = (
  breakdown: CategoryRow[],
  totalSpent: number,
  selectedYear: number,
  t: TFunc,
  onCategoryClick: (cat: CategoryRow) => void,
  currency: string,
) => {
  if (breakdown.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8 px-4">
        {t('analytics.noCategorizedExpenses', { year: selectedYear })}
      </p>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 divide-y divide-border/40">
        {breakdown.map((cat) => {
          const pct = totalSpent > 0 ? (cat.amount / totalSpent) * 100 : 0;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryClick(cat)}
              className="flex items-center gap-4 px-5 py-3.5 w-full text-left transition-colors hover:bg-accent/50 active:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset cursor-pointer"
            >
              {renderCategoryIcon(cat)}
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
                {formatCurrency(cat.amount, currency)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0">
                {Math.round(pct)}%
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
};

const renderCategoryDrillDown = (
  category: CategoryRow | null,
  expenses: Expense[],
  onClose: () => void,
) => {
  if (!category) return null;

  return (
    <CategoryDrillDown
      isOpen={true}
      onClose={onClose}
      categoryName={category.name}
      categoryColor={category.color}
      expenses={expenses}
      totalAmount={category.amount}
    />
  );
};

const renderCategoryIcon = (cat: CategoryRow) => {
  if (cat.icon) {
    return <span className="text-base shrink-0">{cat.icon}</span>;
  }

  return (
    <div
      className="w-2.5 h-2.5 rounded-full shrink-0"
      style={{ backgroundColor: cat.color }}
    />
  );
};

const renderMonthDrillDown = (
  monthKey: string | null,
  expenses: Expense[],
  categories: Category[],
  onClose: () => void,
) => {
  if (!monthKey) return null;

  return (
    <MonthDrillDown
      isOpen={true}
      onClose={onClose}
      monthKey={monthKey}
      expenses={expenses}
      categories={categories}
    />
  );
};
